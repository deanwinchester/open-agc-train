"""
open-agc-train plugin — Model training, fine-tuning, evaluation, and benchmark.

Entry point: init_plugin(context) → PluginInstance
"""
import os
import sys


def init_plugin(context):
    """Initialize the training plugin.

    Args:
        context: PluginContext with .name, .plugin_dir, .db_dir, .broadcast_fn, etc.

    Returns:
        PluginInstance with .router (APIRouter) and .static_dir
    """
    from core.plugin_manager import PluginInstance

    # ── Database setup ──
    from .db import init_db
    db_path = os.path.join(context.db_dir, "training.db")
    init_db(db_path)

    # ── Import engine (with adapted paths) ──
    # Inject plugin_dir into path for internal imports
    plugin_dir = context.plugin_dir
    if plugin_dir not in sys.path:
        sys.path.insert(0, plugin_dir)

    from .engine import get_training_engine, _training_available
    engine = get_training_engine(
        data_dir=os.path.dirname(db_path),
        db_path=db_path,
    )
    if context.broadcast_fn:
        engine.set_broadcast_fn(context.broadcast_fn)

    # ── Build router ──
    from .routes import create_router
    # Also need the benchmark routes init
    def get_llamacpp():
        try:
            from core.llamacpp_manager import get_llamacpp_manager
            return get_llamacpp_manager()
        except ImportError:
            return None

    from .routes_benchmark import init_benchmark_routes

    router = create_router(
        db_path=db_path,
        engine=engine,
        broadcast_fn=context.broadcast_fn,
        server_config=context.server_config,
    )

    # Re-init benchmark routes with plugin db_path
    try:
        init_benchmark_routes(
            db_path=db_path,
            download_state={},
            install_state={"active": False, "stage": "idle", "label": "", "progress": 0, "error": ""},
            broadcast_fn=context.broadcast_fn,
            get_engine=lambda: engine,
            get_llamacpp=get_llamacpp,
            load_config=lambda: context.server_config,
        )
    except Exception as e:
        context.logger(f"[train] Benchmark route init skipped: {e}")

    # ── Static files ──
    static_dir = os.path.join(context.plugin_dir, "static")
    if not os.path.isdir(static_dir):
        static_dir = None

    return PluginInstance(
        name=context.name,
        router=router,
        router_prefix="/api/training",
        static_dir=static_dir,
        state={
            "engine": engine,
            "db_path": db_path,
            "training_available": _training_available,
        },
    )
