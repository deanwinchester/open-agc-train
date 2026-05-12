"""
Plugin APIRouter — wraps all training endpoints.

Uses existing route module functions from api/routes/benchmark.py
and api/routes/downloads.py, re-initialized with the plugin's
database path and engine instance.
"""
import os
import sys

# Ensure the main project is on the path
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from fastapi import APIRouter


def create_router(db_path: str, engine, broadcast_fn, server_config: dict):
    """Create and configure the training APIRouter.

    Args:
        db_path: Path to training.db
        engine: TrainingEngine instance
        broadcast_fn: WebSocket broadcast function
        server_config: Server config dict
    """
    router = APIRouter(prefix="", tags=["training"])

    # ── Re-initialize benchmark routes with plugin deps ──
    from api.routes.benchmark import (
        init_benchmark_routes,
    )
    init_benchmark_routes(
        db_path=db_path,
        download_state={},
        install_state={},
        broadcast_fn=broadcast_fn,
        get_engine=lambda: engine,
        get_llamacpp=get_llamacpp_manager,
        load_config=lambda: server_config,
    )

    # ── Re-initialize download routes with plugin deps ──
    try:
        from api.routes.downloads import (
            init_download_routes,
        )
        init_download_routes(
            db_path=db_path,
            download_state={},
            install_state={"active": False, "stage": "idle", "label": "", "progress": 0, "error": ""},
            broadcast_fn=broadcast_fn,
            training_avail=True,
            get_llamacpp=get_llamacpp_manager,
            load_config=lambda: server_config,
        )
    except ImportError:
        pass

    # ── Mount benchmark routes directly under plugin prefix ──
    # These are ALSO served by the main server at /api/training, but we mount
    # them here so the frontend can use a consistent /api/plugin/open-agc-train prefix.
    from api.routes.benchmark import (
        list_all_models,
        get_benchmark_cache_status,
        pre_download_benchmark,
        list_benchmarks,
        get_benchmark_detail,
        get_checkpoint_status,
        run_benchmark,
        delete_benchmark,
        preview_benchmark_dataset,
        cancel_benchmark,
    )
    router.add_api_route("/all-models", list_all_models, methods=["GET"], tags=["benchmark"])
    router.add_api_route("/benchmark/cache-status", get_benchmark_cache_status, methods=["GET"], tags=["benchmark"])
    router.add_api_route("/benchmark/pre-download", pre_download_benchmark, methods=["POST"], tags=["benchmark"])
    router.add_api_route("/benchmark/preview/{benchmark_type}", preview_benchmark_dataset, methods=["GET"], tags=["benchmark"])
    router.add_api_route("/benchmarks", list_benchmarks, methods=["GET"], tags=["benchmark"])
    router.add_api_route("/benchmarks/{bench_id}", get_benchmark_detail, methods=["GET"], tags=["benchmark"])
    router.add_api_route("/benchmarks/{bench_id}", delete_benchmark, methods=["DELETE"], tags=["benchmark"])
    router.add_api_route("/benchmark/checkpoint-status", get_checkpoint_status, methods=["GET"], tags=["benchmark"])
    router.add_api_route("/benchmark/cancel", cancel_benchmark, methods=["POST"], tags=["benchmark"])
    router.add_api_route("/benchmark", run_benchmark, methods=["POST"], tags=["benchmark"])

    # ── Plugin-specific endpoints (PPL, eval) ──
    _register_eval_endpoints(router, db_path, engine, broadcast_fn)

    # ── Training runs CRUD endpoints ──
    _register_training_endpoints(router, db_path, engine, broadcast_fn, server_config)

    # ── Training status (health check) ──
    @router.get("/status")
    async def training_status():
        avail = engine.is_available()
        return {
            "available": avail,
            "import_error": "" if avail else "训练依赖未安装（需 torch, transformers, peft）",
            "install_state": {"active": False, "stage": "idle", "label": "", "progress": 0},
            "plugin": "open-agc-train",
        }

    return router


def _register_eval_endpoints(router, db_path, engine, broadcast_fn):
    """Register PPL and metrics evaluation endpoints."""
    import json, sqlite3, threading
    from fastapi import HTTPException
    from pydantic import BaseModel
    from typing import Optional

    class EvalPPLRequest(BaseModel):
        dataset_path: str = ""
        max_samples: int = 500
        stride: int = 512
        max_length: int = 1024
        dataset_id: Optional[int] = None

    # Track eval job status: run_id → {status: "running"|"done"|"error", message: str}
    _eval_jobs = {}

    @router.post("/runs/{run_id}/eval-ppl")
    async def eval_model_ppl(run_id: int, req: EvalPPLRequest):
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM training_runs WHERE id=? AND status IN ('completed','aborted_saved')", (run_id,))
        run = cursor.fetchone()
        conn.close()
        if not run:
            raise HTTPException(status_code=404, detail="训练运行不存在或未完成")
        save_dir = run["checkpoint_dir"]
        if not save_dir or not os.path.isdir(save_dir):
            raise HTTPException(status_code=400, detail=f"模型目录不存在: {save_dir}")

        dataset_path = req.dataset_path
        if not dataset_path and save_dir:
            val_file = os.path.join(save_dir, "validation.jsonl")
            if os.path.exists(val_file):
                dataset_path = val_file
        if not dataset_path and req.dataset_id:
            conn2 = sqlite3.connect(db_path)
            conn2.row_factory = sqlite3.Row
            cur = conn2.cursor()
            cur.execute("SELECT storage_path FROM datasets WHERE id=?", (req.dataset_id,))
            ds = cur.fetchone()
            conn2.close()
            if ds and ds["storage_path"]:
                dataset_path = ds["storage_path"]

        _eval_jobs[run_id] = {"status": "running", "message": "评估中...", "progress": 0, "label": "准备中..."}

        def run_eval():
            try:
                from .eval import compute_ppl
                def progress_cb(ratio, label):
                    _eval_jobs[run_id] = {"status": "running", "progress": round(ratio, 3), "label": label}
                    if broadcast_fn:
                        broadcast_fn({"type": "eval_progress", "run_id": run_id,
                                       "progress": ratio, "label": label})
                kwargs = {"model_path": save_dir, "max_samples": req.max_samples,
                          "stride": req.stride, "max_length": req.max_length,
                          "progress_cb": progress_cb}
                if dataset_path and os.path.exists(dataset_path):
                    kwargs["dataset_path"] = dataset_path
                result = compute_ppl(**kwargs)
                conn3 = sqlite3.connect(db_path)
                conn3.cursor().execute(
                    "INSERT INTO benchmark_results (model_id,model_source,benchmark_type,metrics_json,num_questions,avg_latency_ms,tokens_per_second) VALUES (?,?,?,?,?,?,?)",
                    (f"trained/run_{run_id}", "trained", "ppl",
                     json.dumps(result, ensure_ascii=False), result.get("num_windows", 0),
                     result.get("eval_time_seconds", 0) * 1000, 0))
                conn3.commit(); conn3.close()
                _eval_jobs[run_id] = {"status": "done", "ppl": result.get("ppl")}
            except Exception as e:
                _eval_jobs[run_id] = {"status": "error", "message": str(e)}

        threading.Thread(target=run_eval, daemon=True).start()
        return {"status": "started", "message": f"开始 PPL 评估 (run_{run_id})..."}

    @router.get("/runs/{run_id}/eval-ppl")
    async def get_eval_ppl_result(run_id: int):
        # Check in-memory job status first
        job = _eval_jobs.get(run_id)
        if job:
            if job["status"] == "error":
                raise HTTPException(status_code=500, detail=f"PPL 评估失败: {job.get('message', '未知错误')}")
            if job["status"] == "running":
                return {"status": "running", "ppl": None,
                        "progress": job.get("progress", 0),
                        "label": job.get("label", "评估中...")}
        # Check DB for completed results
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM benchmark_results WHERE model_id=? AND benchmark_type='ppl' ORDER BY created_at DESC LIMIT 1",
            (f"trained/run_{run_id}",))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return {"status": "idle", "ppl": None}
        d = dict(row)
        d["metrics_json"] = json.loads(d["metrics_json"]) if isinstance(d["metrics_json"], str) else d["metrics_json"]
        d["status"] = "done"
        return d

    class EvalMetricsRequest(BaseModel):
        model_path: str = ""
        dataset_path: str = ""
        dataset_id: Optional[int] = None
        max_samples: int = 100

    @router.post("/eval-metrics")
    async def eval_generation_metrics(req: EvalMetricsRequest):
        model_path = req.model_path
        if model_path.startswith("run_"):
            run_id = int(model_path.replace("run_", ""))
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT checkpoint_dir FROM training_runs WHERE id=?", (run_id,))
            row = cursor.fetchone()
            conn.close()
            if row and row["checkpoint_dir"]:
                model_path = row["checkpoint_dir"]
            else:
                raise HTTPException(status_code=404, detail="训练运行不存在")
        dataset_path = req.dataset_path
        if not dataset_path and req.dataset_id:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT storage_path FROM datasets WHERE id=?", (req.dataset_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                dataset_path = row["storage_path"]
        if not dataset_path:
            raise HTTPException(status_code=400, detail="请提供评测数据集")

        from .eval import compute_generation_metrics
        result = compute_generation_metrics(model_path, dataset_path, req.max_samples)
        return {"status": "ok", "metrics": result}


def _register_training_endpoints(router, db_path, engine, broadcast_fn, server_config):
    """Register training run CRUD, model configs, datasets, and benchmark endpoints."""
    import json, sqlite3, threading, time as _time
    from fastapi import HTTPException, UploadFile, File, Form
    from pydantic import BaseModel
    from typing import Optional, List

    # ── Model Configs ──
    class ModelConfigRequest(BaseModel):
        name: str
        architecture: str
        config_json: str
        param_count_estimate: int = 0

    @router.get("/model-configs")
    async def list_model_configs():
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM model_configs ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return {"configs": [dict(r) for r in rows]}

    @router.post("/model-configs")
    async def create_model_config(req: ModelConfigRequest):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO model_configs (name, architecture, config_json, param_count_estimate) VALUES (?, ?, ?, ?)",
            (req.name, req.architecture, req.config_json, req.param_count_estimate))
        config_id = cursor.lastrowid
        conn.commit(); conn.close()
        return {"status": "success", "id": config_id}

    @router.get("/model-configs/{config_id}")
    async def get_model_config(config_id: int):
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM model_configs WHERE id=?", (config_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="Config not found")
        return dict(row)

    @router.delete("/model-configs/{config_id}")
    async def delete_model_config(config_id: int):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM model_configs WHERE id=?", (config_id,))
        conn.commit(); conn.close()
        return {"status": "success"}

    # ── Estimate ──
    class EstimateRequest(BaseModel):
        architecture: str
        config_json: str

    @router.post("/model-configs/estimate")
    async def estimate_model(req: EstimateRequest):
        import math
        config = json.loads(req.config_json)
        arch = req.architecture
        num_layers = config.get("num_layers", 12)
        hidden_size = config.get("hidden_size", 768)
        num_heads = config.get("num_attention_heads", 12)
        intermediate_size = config.get("intermediate_size", hidden_size * 4)
        vocab_size = config.get("vocab_size", 50000)
        max_seq_len = config.get("max_seq_len", config.get("max_seq_length", 2048))
        head_dim = hidden_size // num_heads
        norm_type = config.get("norm_type", "layer_norm")
        norm_params = hidden_size if norm_type == "rms_norm" else 2 * hidden_size
        tie_embeddings = config.get("tie_word_embeddings", False)
        embed_params = vocab_size * hidden_size
        pos_encoding = config.get("pos_encoding", "rope")
        if pos_encoding == "learned":
            embed_params += max_seq_len * hidden_size

        if arch in ("gpt_decoder", "llama"):
            kv_heads = int(config.get("kv_heads", num_heads))
            attn_params = (hidden_size * hidden_size + 2 * hidden_size * kv_heads * head_dim + hidden_size * hidden_size)
            activation = config.get("activation", "gelu")
            ffn_params = 3 * hidden_size * intermediate_size if activation in ("swiglu","silu") else 2 * hidden_size * intermediate_size
            np = 3 if config.get("norm_position","pre_norm") == "sandwich_norm" else 2
            layer_params = attn_params + ffn_params + np * norm_params
            total_params = embed_params + num_layers * layer_params
            if not tie_embeddings: total_params += hidden_size * vocab_size
            total_params += norm_params
        elif arch == "moe":
            kv_heads = int(config.get("kv_heads", num_heads))
            attn_params = hidden_size * hidden_size + 2 * hidden_size * kv_heads * head_dim + hidden_size * hidden_size
            num_experts = config.get("num_experts", 8)
            expert_ffn = 3 * hidden_size * intermediate_size
            router_params = hidden_size * num_experts
            layer_params = attn_params + num_experts * expert_ffn + router_params + 2 * norm_params
            total_params = embed_params + num_layers * layer_params
            if not tie_embeddings: total_params += hidden_size * vocab_size
            total_params += norm_params
        else:
            attn_params = 4 * hidden_size * hidden_size
            ffn_params = 2 * hidden_size * intermediate_size
            layer_params = attn_params + ffn_params + 2 * norm_params
            total_params = embed_params + num_layers * layer_params + norm_params
            if not tie_embeddings: total_params += hidden_size * vocab_size

        flops_per_token = 2 * total_params
        fp32_bytes = total_params * 4
        memory_mb = round(fp32_bytes / (1024 * 1024))
        training_memory_mb = round(fp32_bytes * 4 / (1024 * 1024))
        return {
            "total_params": total_params,
            "total_params_formatted": f"{total_params/1e6:.1f}M" if total_params < 1e9 else f"{total_params/1e9:.2f}B",
            "flops_per_forward": round(flops_per_token * max_seq_len),
            "flops_per_token": round(flops_per_token),
            "embed_params": embed_params,
            "per_layer_params": round(total_params / num_layers) if num_layers else 0,
            "num_layers": num_layers,
            "architecture": arch,
            "memory_mb": memory_mb,
            "training_memory_mb": training_memory_mb,
        }

    # ── Training Runs ──
    class CreateTrainingRunRequest(BaseModel):
        name: str
        model_config_id: Optional[int] = None
        dataset_id: Optional[int] = None
        base_model_id: Optional[str] = ""
        base_model_source: str = "huggingface"
        training_params_json: str = "{}"
        val_ratio: float = 0.1

    @router.post("/runs")
    async def create_training_run(req: CreateTrainingRunRequest):
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO training_runs (name, model_config_id, dataset_id, base_model_id, base_model_source, training_params_json, status) VALUES (?,?,?,?,?,?, 'pending')",
            (req.name, req.model_config_id, req.dataset_id, req.base_model_id, req.base_model_source, req.training_params_json))
        run_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM training_runs WHERE id=?", (run_id,))
        run_record = dict(cursor.fetchone())
        conn.close()
        run_record["val_ratio"] = req.val_ratio

        if engine.is_available():
            ok = engine.start_training(run_id, run_record)
            if ok:
                return {"status": "started", "run_id": run_id}
            return {"status": "queued", "message": "另一个训练已在运行中"}
        return {"status": "error", "detail": "训练环境不可用"}

    @router.get("/runs")
    async def list_training_runs():
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM training_runs ORDER BY created_at DESC LIMIT 50")
        rows = cursor.fetchall()
        conn.close()
        return {"runs": [dict(r) for r in rows]}

    @router.get("/runs/{run_id}")
    async def get_training_run(run_id: int):
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM training_runs WHERE id=?", (run_id,))
        row = cursor.fetchone()
        conn.close()
        if not row: raise HTTPException(status_code=404)
        return dict(row)

    @router.delete("/runs/{run_id}")
    async def delete_training_run(run_id: int):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM training_runs WHERE id=?", (run_id,))
        conn.commit(); conn.close()
        return {"status": "success"}

    # ── Test trained model chat ──
    class TestModelRequest(BaseModel):
        prompt: str
        max_length: int = 200
        temperature: float = 0.7

    @router.post("/runs/{run_id}/test-chat")
    async def test_trained_model(run_id: int, req: TestModelRequest):
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT checkpoint_dir FROM training_runs WHERE id=? AND status IN ('completed','aborted_saved')", (run_id,))
        row = cursor.fetchone()
        conn.close()
        if not row or not row["checkpoint_dir"]:
            raise HTTPException(status_code=404, detail="训练好的模型尚未保存或不存在")
        save_dir = row["checkpoint_dir"]
        if not os.path.isdir(save_dir):
            raise HTTPException(status_code=404, detail=f"模型目录不存在: {save_dir}")
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer
            tokenizer = AutoTokenizer.from_pretrained(save_dir)
            model = AutoModelForCausalLM.from_pretrained(
                save_dir,
                device_map="auto" if torch.cuda.is_available() else None,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
            )
            inputs = tokenizer(req.prompt, return_tensors="pt")
            if torch.cuda.is_available():
                inputs = {k: v.to("cuda") for k, v in inputs.items()}
            outputs = model.generate(
                **inputs,
                max_new_tokens=req.max_length,
                temperature=req.temperature,
                do_sample=req.temperature > 0,
                pad_token_id=tokenizer.eos_token_id
            )
            text = tokenizer.decode(outputs[0], skip_special_tokens=True)
            if text.startswith(req.prompt):
                text = text[len(req.prompt):].strip()
            return {"response": text}
        except ImportError:
            raise HTTPException(status_code=500, detail="需要安装 torch 和 transformers 才能测试模型")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"模型推理失败: {str(e)}")

    # ── Training Run Control (wildcard action — must be after specific routes) ──
    @router.post("/runs/{run_id}/{action}")
    async def control_training_run(run_id: int, action: str):
        state = engine.get_state()
        if state.get("run_id") != run_id:
            raise HTTPException(status_code=400, detail="该运行不是当前活动运行")
        action_map = {
            "pause": engine.pause_training, "resume": engine.resume_training,
            "step": engine.step_training, "abort": engine.abort_training,
            "abort_save": engine.abort_and_save_training,
        }
        if action not in action_map:
            raise HTTPException(status_code=400, detail=f"未知操作: {action}")
        ok = action_map[action]()
        if not ok:
            raise HTTPException(status_code=400, detail=f"无法执行 {action}")
        return {"status": engine.get_state()["status"]}

    @router.post("/runs/{run_id}/layer-stats-toggle")
    async def toggle_layer_stats(run_id: int):
        state = engine.get_state()
        if state.get("run_id") != run_id:
            raise HTTPException(status_code=400, detail="该运行不是当前活动运行")
        current = getattr(engine, '_layer_stats_enabled', True)
        engine.set_layer_stats_enabled(not current)
        return {"layer_stats_enabled": not current}

    # ── Datasets ──
    @router.get("/datasets")
    async def list_datasets():
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM datasets ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return {"datasets": [dict(r) for r in rows]}

    @router.get("/base-models")
    async def list_base_models():
        """List available GGUF + trained models + HF presets for fine-tuning."""
        models = []
        seen = set()

        def add(mid, name, source):
            if mid not in seen:
                seen.add(mid)
                models.append({"id": mid, "name": name, "source": source})

        # GGUF models via llama.cpp manager (scans main app's models dir)
        try:
            lm = get_llamacpp_manager()
            if lm:
                for fname in lm.list_models():
                    add(f"llamacpp/{fname}", fname, "gguf")
        except Exception:
            pass

        # Completed training runs with checkpoints
        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute(
                "SELECT id, name, checkpoint_dir FROM training_runs "
                "WHERE status IN ('completed','aborted_saved') AND checkpoint_dir IS NOT NULL "
                "ORDER BY updated_at DESC"
            )
            for row in cur.fetchall():
                if row["checkpoint_dir"] and os.path.isdir(row["checkpoint_dir"]):
                    add(f"trained/run_{row['id']}", f"{row['name']} (训练模型)", "trained")
            conn.close()
        except Exception:
            pass

        # HF presets
        presets = [
            "Qwen/Qwen2.5-0.5B-Instruct",
            "Qwen/Qwen2.5-1.5B-Instruct",
            "Qwen/Qwen2.5-7B-Instruct",
            "meta-llama/Llama-3.2-1B-Instruct",
            "meta-llama/Llama-3.2-3B-Instruct",
            "mistralai/Mistral-7B-Instruct-v0.3",
            "google/gemma-2-2b-it",
            "microsoft/Phi-3-mini-4k-instruct",
        ]
        for m in presets:
            add(m, m.split("/")[-1], "huggingface")

        return {"models": models}

    @router.post("/datasets/scan-import")
    async def scan_import_datasets():
        """Auto-detect datasets in the datasets directory and import them."""
        ds_dir = os.path.join(os.path.dirname(db_path), "datasets")
        imported = 0
        if os.path.isdir(ds_dir):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            for fname in os.listdir(ds_dir):
                if fname.endswith((".jsonl", ".json", ".txt")):
                    fpath = os.path.join(ds_dir, fname)
                    cursor.execute("SELECT id FROM datasets WHERE source_path=?", (fpath,))
                    if cursor.fetchone():
                        continue
                    # Count lines
                    count = 0
                    with open(fpath, "r", encoding="utf-8") as f:
                        for _ in f:
                            count += 1
                    name = os.path.splitext(fname)[0]
                    cursor.execute(
                        "INSERT INTO datasets (name, source, source_path, storage_path, sample_count) VALUES (?,?,?,?,?)",
                        (name, "auto_scan", fpath, fpath, count))
                    imported += 1
            conn.commit()
            conn.close()
        return {"status": "success", "imported": imported}

    @router.get("/datasets/{ds_id}")
    async def get_dataset(ds_id: int):
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM datasets WHERE id=?", (ds_id,))
        row = cursor.fetchone()
        conn.close()
        if not row: raise HTTPException(status_code=404)
        return dict(row)

    @router.get("/datasets/{ds_id}/preview")
    async def preview_dataset(ds_id: int, n: int = 5):
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM datasets WHERE id=?", (ds_id,))
        row = cursor.fetchone()
        conn.close()
        if not row: raise HTTPException(status_code=404)
        path = row["storage_path"]
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="文件不存在")
        samples = []
        with open(path, "r", encoding="utf-8") as f:
            for i, line in enumerate(f):
                if i >= n: break
                if line.strip():
                    try: samples.append(json.loads(line))
                    except: samples.append(line.strip())
        return {"samples": samples, "name": row["name"], "count": row["sample_count"]}

    @router.delete("/datasets/{ds_id}")
    async def delete_dataset(ds_id: int):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM datasets WHERE id=?", (ds_id,))
        conn.commit(); conn.close()
        return {"status": "success"}

    # ── Dataset Upload & Creation ──
    class CreateDatasetRequest(BaseModel):
        name: str
        samples: str = ""   # JSONL content from editor
        format: str = "jsonl"

    @router.post("/datasets/upload")
    async def upload_dataset(file: UploadFile = File(...), name: str = Form("")):
        ds_dir = os.path.join(os.path.dirname(db_path), "datasets")
        os.makedirs(ds_dir, exist_ok=True)
        fname = file.filename or "dataset.jsonl"
        fpath = os.path.join(ds_dir, fname)
        content = await file.read()
        with open(fpath, "wb") as f:
            f.write(content)
        # Count lines
        count = 0
        with open(fpath, "r", encoding="utf-8") as f:
            for _ in f:
                count += 1
        ds_name = name or os.path.splitext(fname)[0]
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO datasets (name, source, source_path, storage_path, sample_count) VALUES (?,?,?,?,?)",
            (ds_name, "upload", fpath, fpath, count))
        ds_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {"status": "success", "id": ds_id, "sample_count": count}

    @router.put("/datasets/{ds_id}")
    async def update_dataset(ds_id: int, req: CreateDatasetRequest):
        ds_dir = os.path.join(os.path.dirname(db_path), "datasets")
        os.makedirs(ds_dir, exist_ok=True)
        fname = f"{req.name}.jsonl"
        fpath = os.path.join(ds_dir, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(req.samples)
        count = len([l for l in req.samples.split("\n") if l.strip()])
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE datasets SET name=?, source_path=?, storage_path=?, sample_count=?, format=? WHERE id=?",
            (req.name, fpath, fpath, count, req.format, ds_id))
        conn.commit()
        conn.close()
        return {"status": "success", "sample_count": count}

    @router.post("/datasets/create")
    async def create_dataset(req: CreateDatasetRequest):
        ds_dir = os.path.join(os.path.dirname(db_path), "datasets")
        os.makedirs(ds_dir, exist_ok=True)
        fname = f"{req.name}.jsonl"
        fpath = os.path.join(ds_dir, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(req.samples)
        count = len([l for l in req.samples.split("\n") if l.strip()])
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO datasets (name, source, source_path, storage_path, sample_count, format) VALUES (?,?,?,?,?,?)",
            (req.name, "manual", fpath, fpath, count, req.format))
        ds_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {"status": "success", "id": ds_id, "sample_count": count}

    # ── Recommendations ──
    @router.get("/recommended-datasets")
    async def get_recommended():
        return {"datasets": RECOMMENDED_DATASETS}


# ── Shared constants ──
RECOMMENDED_DATASETS = [
    {"repo_id": "fuguowen/alpaca_zh", "name": "Alpaca 中文指令", "desc": "中文指令微调数据集，约4.8万条", "size": "~50MB", "splits": ["train"]},
    {"repo_id": "tatsu-lab/alpaca", "name": "Alpaca 英文指令 (52K)", "desc": "经典英文指令微调数据集", "size": "~25MB", "splits": ["train"]},
    {"repo_id": "databricks/databricks-dolly-15k", "name": "Dolly 15K", "desc": "Databricks 通用指令数据集", "size": "~10MB", "splits": ["train"]},
    {"repo_id": "Open-Orca/OpenOrca", "name": "OpenOrca", "desc": "大规模推理链微调数据", "size": "~800MB", "splits": ["train"]},
    {"repo_id": "Open-Orca/SlimOrca", "name": "SlimOrca", "desc": "精简版推理链数据集", "size": "~200MB", "splits": ["train"]},
    {"repo_id": "HuggingFaceH4/ultrachat_200k", "name": "UltraChat 200K", "desc": "多轮对话微调数据", "size": "~1.5GB", "splits": ["train_sft", "test_sft"]},
    {"repo_id": "Salesforce/wikitext", "name": "WikiText-103", "desc": "语言建模基准数据集", "size": "~180MB", "splits": ["train","validation","test"], "config": "wikitext-103-raw-v1"},
    {"repo_id": "cnn_dailymail", "name": "CNN/DailyMail", "desc": "新闻摘要数据集", "size": "~550MB", "splits": ["train","validation","test"], "config": "3.0.0"},
]


def get_llamacpp_manager():
    """Lazy import for llama.cpp manager (from main project)."""
    try:
        from core.llamacpp_manager import get_llamacpp_manager as _get
        return _get()
    except ImportError:
        return None
