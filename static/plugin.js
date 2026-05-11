// =============================================
// open-agc-train — Frontend Plugin
// Injects training views, registers hooks, handles events
// =============================================
(function () {
  'use strict';

  const viewsHTML = `
<!-- ============ View: Training Designer ============ -->
<div class="view" id="view-training-designer">
  <header class="view-header">
    <h1>模型设计器</h1>
    <p class="view-desc">配置模型架构与超参数，预览参数量与计算量</p>
  </header>
  <div class="settings-body">
    <section class="card training-deps-missing" style="display:none;border-color:rgba(245,158,11,0.4);background:rgba(245,158,11,0.05);">
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <span style="font-size:1.2rem;">⚠️</span>
        <div style="flex:1;"><strong>训练依赖未安装</strong>
          <div class="training-deps-msg" style="font-size:0.78rem;color:var(--text-secondary);margin-top:0.15rem;"></div>
        </div>
        <button class="btn-primary training-deps-install" style="white-space:nowrap;">一键安装</button>
      </div>
      <div class="training-deps-progress" style="display:none;margin-top:0.5rem;">
        <div class="training-deps-label" style="font-size:0.78rem;"></div>
        <div style="height:4px;background:var(--border-color);border-radius:2px;margin-top:0.3rem;">
          <div class="training-deps-bar" style="width:0%;height:100%;background:var(--theme-color);border-radius:2px;transition:width 0.3s;"></div>
        </div>
      </div>
    </section>
    <section class="card">
      <div class="card-header"><h2>架构类型</h2><p class="card-desc">选择模型的基础架构</p></div>
      <div class="arch-selector" id="arch-selector">
        <div class="arch-option-wrapper"><button class="arch-option selected" data-arch="gpt_decoder">GPT Decoder</button><small class="arch-desc">自回归解码器。GPT-2/3 风格，单向注意力，适合文本生成</small></div>
        <div class="arch-option-wrapper"><button class="arch-option" data-arch="llama">LLaMA</button><small class="arch-desc">旋转位置编码 + SwiGLU + RMSNorm。高效推理，Llama/Qwen 家族</small></div>
        <div class="arch-option-wrapper"><button class="arch-option" data-arch="bert_encoder">BERT Encoder</button><small class="arch-desc">双向 Transformer 编码器。适合分类、NER、嵌入等理解任务</small></div>
        <div class="arch-option-wrapper"><button class="arch-option" data-arch="moe">MoE (专家混合)</button><small class="arch-desc">稀疏激活 FFN 层，多个专家并行。Mixtral/DeepSeek 架构</small></div>
        <div class="arch-option-wrapper"><button class="arch-option" data-arch="diffusion_dit">Diffusion DiT</button><small class="arch-desc">扩散 Transformer。使用 AdaLN 条件调制，适合图像/视频生成</small></div>
        <div class="arch-option-wrapper"><button class="arch-option" data-arch="mamba_ssm">Mamba / SSM</button><small class="arch-desc">状态空间模型替代注意力。线性复杂度，长序列优势</small></div>
      </div>
    </section>
    <section class="card" id="card-mode-toggle">
      <div class="card-header"><h2>设计模式</h2></div>
      <div style="display:flex;gap:0.5rem;">
        <button id="mode-template-btn" class="arch-option selected" style="flex:1;">模板定制</button>
        <button id="mode-component-btn" class="arch-option" style="flex:1;">组件搭建</button>
      </div>
    </section>
    <section class="card" id="card-component-builder" style="display:none;">
      <div class="card-header"><h2>组件库</h2><p class="card-desc">点击组件添加到层列表</p></div>
      <div id="component-palette" style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.8rem;"></div>
      <div class="card-header"><h2>层序列</h2><p class="card-desc">拖拽排序 · 每层独立配置</p></div>
      <div id="layer-editor" style="min-height:80px;border:2px dashed var(--border-color);border-radius:8px;padding:0.5rem;">
        <div style="color:var(--text-secondary);font-size:0.8rem;text-align:center;padding:1.5rem;">从上方组件库添加块，或点击预设模板</div>
      </div>
      <div style="margin-top:0.5rem;display:flex;gap:0.4rem;">
        <button id="layer-preset-gpt" class="btn-secondary" style="font-size:0.72rem;">GPT 模板</button>
        <button id="layer-preset-llama" class="btn-secondary" style="font-size:0.72rem;">LLaMA 模板</button>
        <button id="layer-preset-clear" class="btn-secondary" style="font-size:0.72rem;">清空</button>
      </div>
    </section>
    <div id="template-cards">
    <section class="card">
      <div class="card-header"><h2>核心超参数</h2></div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>层数</label><input type="number" id="hp-num-layers" class="input-styled" value="12" min="1" max="200"></div>
        <div class="field" style="flex:1;"><label>隐藏维度</label><input type="number" id="hp-hidden-size" class="input-styled" value="768" min="64" max="32768" step="64"></div>
        <div class="field" style="flex:1;"><label>注意力头数</label><input type="number" id="hp-num-heads" class="input-styled" value="12" min="1" max="128"></div>
      </div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>中间层维度</label><input type="number" id="hp-intermediate" class="input-styled" value="3072" min="64" max="131072" step="64"></div>
        <div class="field" style="flex:1;"><label>词表大小</label><input type="number" id="hp-vocab-size" class="input-styled" value="50000" min="1000"></div>
        <div class="field" style="flex:1;"><label>最大序列长度</label><input type="number" id="hp-max-seq" class="input-styled" value="2048" min="128"></div>
      </div>
      <div class="model-row" style="gap:1rem;" id="moe-fields" style="display:none;">
        <div class="field" style="flex:1;"><label>专家数量 (MoE)</label><input type="number" id="hp-num-experts" class="input-styled" value="8" min="2"></div>
        <div class="field" style="flex:1;"><label>激活专家数</label><input type="number" id="hp-active-experts" class="input-styled" value="2" min="1"></div>
      </div>
    </section>
    <section class="card">
      <div class="card-header"><h2>注意力与残差机制</h2><p class="card-desc">细粒度控制 Transformer 内部结构</p></div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>注意力类型</label>
          <select id="hp-attention-type" class="select-styled">
            <option value="scaled_dot">缩放点积注意力 (标准)</option>
            <option value="flash_attn">Flash Attention (高效)</option>
            <option value="mqa">Multi-Query Attention (MQA)</option>
            <option value="gqa">Grouped-Query Attention (GQA)</option>
          </select>
        </div>
        <div class="field" style="flex:1;" id="gqa-kv-field" style="display:none;">
          <label>KV 头数 (GQA)</label><input type="number" id="hp-kv-heads" class="input-styled" value="4" min="1">
        </div>
      </div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>残差归一化位置</label>
          <select id="hp-norm-position" class="select-styled">
            <option value="pre_norm">Pre-Norm (主流/稳定)</option>
            <option value="post_norm">Post-Norm (原始 Transformer)</option>
            <option value="sandwich_norm">Sandwich Norm (Pre+Post)</option>
          </select>
        </div>
        <div class="field" style="flex:1;"><label>归一化类型</label>
          <select id="hp-norm-type" class="select-styled">
            <option value="layer_norm">LayerNorm</option>
            <option value="rms_norm">RMSNorm (LLaMA 风格)</option>
          </select>
        </div>
      </div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>位置编码</label>
          <select id="hp-pos-encoding" class="select-styled">
            <option value="rope">RoPE (旋转位置编码)</option>
            <option value="learned">可学习位置编码 (GPT 风格)</option>
            <option value="sinusoidal">正弦位置编码 (原始)</option>
            <option value="alibi">ALiBi (线性偏置)</option>
            <option value="none">无位置编码</option>
          </select>
        </div>
        <div class="field" style="flex:1;"><label>激活函数</label>
          <select id="hp-activation" class="select-styled">
            <option value="gelu">GELU</option>
            <option value="silu">SiLU / Swish</option>
            <option value="swiglu">SwiGLU (LLaMA 风格)</option>
            <option value="relu">ReLU</option>
            <option value="gelu_new">GELU New</option>
          </select>
        </div>
      </div>
      <div class="field"><label>Dropout</label>
        <div class="model-row" style="gap:1rem;">
          <div class="field" style="flex:1;"><label style="font-size:0.72rem;">注意力 Dropout</label><input type="number" id="hp-attn-dropout" class="input-styled" value="0.1" min="0" max="1" step="0.05"></div>
          <div class="field" style="flex:1;"><label style="font-size:0.72rem;">残差 Dropout</label><input type="number" id="hp-resid-dropout" class="input-styled" value="0.1" min="0" max="1" step="0.05"></div>
          <div class="field" style="flex:1;"><label style="font-size:0.72rem;">嵌入 Dropout</label><input type="number" id="hp-embd-dropout" class="input-styled" value="0.1" min="0" max="1" step="0.05"></div>
        </div>
      </div>
    </section>
    <section class="card" id="card-advanced-common">
      <div class="card-header"><h2>高级通用参数</h2><p class="card-desc">精细控制网络构造与初始化</p></div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>head_dim (头维度)</label><input type="number" id="hp-head-dim" class="input-styled" value="0" min="0" max="512" step="8"><small class="field-hint">0=自动计算(hidden_size/num_heads)</small></div>
        <div class="field" style="flex:1;"><label>RoPE theta</label><input type="number" id="hp-rope-theta" class="input-styled" value="10000" min="100" step="1000"><small class="field-hint">旋转位置编码频率基数</small></div>
        <div class="field" style="flex:1;"><label>rms_norm_eps</label><input type="number" id="hp-rms-norm-eps" class="input-styled" value="1e-6" min="1e-9" max="1e-3" step="1e-7"><small class="field-hint">RMSNorm 防除零常数</small></div>
      </div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>绑定嵌入权重</label><select id="hp-tie-embeddings" class="select-styled"><option value="true">是 (共享 LM Head)</option><option value="false">否 (独立输出层)</option></select></div>
        <div class="field" style="flex:1;"><label>FFN 放大比率</label><input type="number" id="hp-ffn-ratio" class="input-styled" value="4.0" min="1" max="16" step="0.5"><small class="field-hint">intermediate = ratio × hidden_size</small></div>
        <div class="field" style="flex:1;"><label>QKV 偏置</label><select id="hp-qkv-bias" class="select-styled"><option value="false">否 (LLaMA 风格)</option><option value="true">是</option></select></div>
      </div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>初始化范围</label><input type="number" id="hp-init-range" class="input-styled" value="0.02" min="0.001" max="1" step="0.001"></div>
      </div>
    </section>
    <section class="card" id="card-moe-specific" style="display:none;">
      <div class="card-header"><h2>MoE 专有参数</h2><p class="card-desc">专家路由和负载均衡</p></div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>路由类型</label><select id="hp-router-type" class="select-styled"><option value="topk">Top-K 路由</option><option value="switch">Switch 路由 (k=1)</option><option value="expert_choice">Expert Choice</option></select></div>
        <div class="field" style="flex:1;"><label>专家容量因子</label><input type="number" id="hp-expert-capacity" class="input-styled" value="1.25" min="0.5" max="8" step="0.25"><small class="field-hint">tokens_per_expert 乘数</small></div>
        <div class="field" style="flex:1;"><label>辅助损失权重</label><input type="number" id="hp-aux-loss-weight" class="input-styled" value="0.02" min="0" max="1" step="0.01"><small class="field-hint">负载均衡正则化强度</small></div>
      </div>
      <div class="field"><label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;"><input type="checkbox" id="hp-shared-expert"> 启用共享专家 (所有 token 都经过的密集 FFN)</label></div>
    </section>
    <section class="card" id="card-mamba-specific" style="display:none;">
      <div class="card-header"><h2>Mamba / SSM 专有参数</h2><p class="card-desc">状态空间模型配置</p></div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>d_state (状态维度)</label><input type="number" id="hp-d-state" class="input-styled" value="16" min="4" max="256" step="4"></div>
        <div class="field" style="flex:1;"><label>d_conv (卷积核)</label><input type="number" id="hp-d-conv" class="input-styled" value="4" min="2" max="8"></div>
        <div class="field" style="flex:1;"><label>dt_rank</label><input type="number" id="hp-dt-rank" class="input-styled" value="-1" min="-1" max="256"><small class="field-hint">-1=自动(ceil(H/16))</small></div>
      </div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>expand_factor (扩展比)</label><input type="number" id="hp-expand-factor" class="input-styled" value="2" min="1" max="8" step="0.5"></div>
      </div>
    </section>
    <section class="card" id="card-dit-specific" style="display:none;">
      <div class="card-header"><h2>Diffusion DiT 专有参数</h2><p class="card-desc">扩散 Transformer 配置</p></div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>patch_size</label><input type="number" id="hp-patch-size" class="input-styled" value="2" min="1" max="32"></div>
        <div class="field" style="flex:1;"><label>in_channels</label><input type="number" id="hp-in-channels" class="input-styled" value="4" min="1" max="256"><small class="field-hint">VAE latent 通道数</small></div>
        <div class="field" style="flex:1;"><label>out_channels</label><input type="number" id="hp-out-channels" class="input-styled" value="4" min="1" max="256"></div>
      </div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>AdaLN hidden dim</label><input type="number" id="hp-adaln-hidden" class="input-styled" value="0" min="0" max="32768"><small class="field-hint">0=使用 hidden_size</small></div>
      </div>
    </section>
    </div><!-- /template-cards -->
    <section class="card" id="card-arch-viz" style="display:none;">
      <div class="card-header"><h2>架构结构图</h2></div>
      <div id="arch-viz-content" style="padding:1rem;overflow-x:auto;"></div>
    </section>
    <div id="validation-warnings" style="display:none;margin-bottom:0.5rem;"></div>
    <section class="card" id="model-preview-card">
      <div class="card-header"><h2>模型预览</h2></div>
      <div id="model-preview-content"><div class="empty-state"><p>配置参数后点击"估算"查看</p></div></div>
    </section>
    <div class="global-actions">
      <button id="ai-design-btn" class="btn-primary" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);">🤖 AI 设计</button>
      <button id="estimate-model-btn" class="btn-primary">估算参数量</button>
      <button id="gen-code-btn" class="btn-secondary" style="font-size:0.8rem;">生成代码</button>
      <button id="export-model-btn" class="btn-secondary" style="font-size:0.8rem;">导出训练包</button>
      <button id="save-model-config-btn" class="btn-save" style="margin-left:auto;">保存配置</button>
    </div>
    <section class="card" id="saved-configs-card">
      <div class="card-header"><h2>已保存的配置</h2></div>
      <div id="saved-configs-list"><div class="empty-state"><p>暂无保存的配置</p></div></div>
    </section>
  </div>
</div>

<!-- ============ View: Training Datasets ============ -->
<div class="view" id="view-training-datasets">
  <header class="view-header"><h1>数据集管理</h1><p class="view-desc">上传、导入推荐数据集或手动创建训练数据</p></header>
  <div class="settings-body">
    <section class="card" id="training-deps-missing-card" style="display:none;border-color:rgba(245,158,11,0.4);background:rgba(245,158,11,0.05);">
      <div style="display:flex;align-items:center;gap:0.75rem;"><span style="font-size:1.2rem;">⚠️</span>
        <div style="flex:1;"><strong>训练依赖未安装</strong><div id="training-deps-missing-msg" style="font-size:0.78rem;color:var(--text-secondary);margin-top:0.15rem;"></div></div>
        <button id="training-deps-install-btn" class="btn-primary" style="white-space:nowrap;">一键安装</button>
      </div>
      <div id="training-deps-install-progress" style="display:none;margin-top:0.5rem;">
        <div style="font-size:0.78rem;" id="training-deps-install-label">正在安装...</div>
        <div style="height:4px;background:var(--border-color);border-radius:2px;margin-top:0.3rem;">
          <div id="training-deps-install-bar" style="width:0%;height:100%;background:var(--theme-color);border-radius:2px;transition:width 0.3s;"></div>
        </div>
      </div>
    </section>
    <section class="card">
      <div class="card-header"><h2>⭐ 推荐数据集 (HuggingFace)</h2><p class="card-desc">一键下载优质开源数据集，支持进度显示与断点续传</p></div>
      <div id="recommended-datasets-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:0.75rem;"><div class="empty-state"><p>加载中...</p></div></div>
      <div style="margin-top:0.5rem;">
        <div class="field"><input type="text" id="ds-hf-custom" class="input-styled" placeholder="或输入其他 HF 仓库 ID 下载..."></div>
        <button id="ds-hf-import-btn" class="btn-secondary" style="margin-top:0.25rem;">下载自定义数据集</button>
      </div>
    </section>
    <section class="card">
      <div class="card-header"><h2>上传本地文件</h2></div>
      <div class="field"><label>数据集名称</label><input type="text" id="ds-upload-name" class="input-styled" placeholder="输入数据集名称"></div>
      <div class="field"><input type="file" id="ds-file-input" class="input-styled" accept=".jsonl,.csv,.parquet" style="padding:0.4rem;"></div>
      <button id="ds-upload-btn" class="btn-primary">上传</button>
    </section>
    <section class="card">
      <div class="card-header"><h2>✏️ 新建数据集</h2><p class="card-desc">手动编辑 JSONL 格式的训练数据</p></div>
      <div class="field"><label>数据集名称</label><input type="text" id="ds-editor-name" class="input-styled" placeholder="输入数据集名称"></div>
      <div class="field"><label>JSONL 内容 (每行一个 JSON)</label>
        <textarea id="ds-editor-content" class="input-styled" rows="10" style="font-family:monospace;font-size:0.78rem;width:100%;box-sizing:border-box;" placeholder='{"instruction": "...", "output": "..."}'></textarea>
      </div>
      <div style="display:flex;gap:0.5rem;">
        <button id="ds-editor-add-sample" class="btn-secondary">添加样本模板</button>
        <button id="ds-editor-validate" class="btn-secondary">验证 JSON</button>
        <button id="ds-editor-save" class="btn-primary" style="margin-left:auto;">保存数据集</button>
      </div>
      <div id="ds-editor-status" style="font-size:0.78rem;margin-top:0.4rem;"></div>
    </section>
    <section class="card">
      <div class="card-header"><h2>数据集列表</h2></div>
      <div id="dataset-list-container"><div class="empty-state"><p>暂无数据集</p></div></div>
    </section>
  </div>
</div>

<!-- ============ View: Training Scratch ============ -->
<div class="view" id="view-training-scratch">
  <header class="view-header"><h1>模型训练</h1><p class="view-desc">选择模型设计器中保存的架构配置和数据集，从头开始训练模型</p></header>
  <div class="settings-body">
    <section class="card training-deps-missing" style="display:none;border-color:rgba(245,158,11,0.4);background:rgba(245,158,11,0.05);">
      <div style="display:flex;align-items:center;gap:0.75rem;"><span style="font-size:1.2rem;">⚠️</span>
        <div style="flex:1;"><strong>训练依赖未安装</strong><div class="training-deps-msg" style="font-size:0.78rem;color:var(--text-secondary);margin-top:0.15rem;"></div></div>
        <button class="btn-primary training-deps-install" style="white-space:nowrap;">一键安装</button>
      </div>
      <div class="training-deps-progress" style="display:none;margin-top:0.5rem;">
        <div class="training-deps-label" style="font-size:0.78rem;"></div>
        <div style="height:4px;background:var(--border-color);border-radius:2px;margin-top:0.3rem;"><div class="training-deps-bar" style="width:0%;height:100%;background:var(--theme-color);border-radius:2px;transition:width 0.3s;"></div></div>
      </div>
    </section>
    <section class="card">
      <div class="card-header"><h2>模型配置</h2><p class="card-desc">选择在模型设计器中保存的架构配置</p></div>
      <div class="field"><label>选择配置</label><select id="scratch-model-config" class="select-styled" onchange="onScratchConfigSelected()"><option value="">加载中...</option></select></div>
      <div id="scratch-config-preview" style="margin-top:0.75rem;display:none;">
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <span class="badge" style="background:var(--theme-color);color:#fff;padding:0.15rem 0.5rem;border-radius:4px;font-size:0.72rem;" id="scratch-preview-arch"></span>
          <span class="badge" style="background:var(--bg-card-hover);padding:0.15rem 0.5rem;border-radius:4px;font-size:0.72rem;" id="scratch-preview-params"></span>
          <span class="badge" style="background:var(--bg-card-hover);padding:0.15rem 0.5rem;border-radius:4px;font-size:0.72rem;" id="scratch-preview-layers"></span>
        </div>
        <details style="margin-top:0.5rem;"><summary style="font-size:0.78rem;cursor:pointer;color:var(--text-secondary);">查看完整配置</summary>
          <pre id="scratch-config-json" style="font-size:0.7rem;max-height:200px;overflow-y:auto;background:var(--bg-card-hover);padding:0.5rem;border-radius:4px;margin-top:0.25rem;"></pre>
        </details>
      </div>
    </section>
    <section class="card"><div class="card-header"><h2>数据集</h2></div>
      <div class="field"><label>选择数据集</label><select id="scratch-dataset" class="select-styled"><option value="">加载中...</option></select></div>
    </section>
    <section class="card">
      <div class="card-header"><h2>训练参数</h2></div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>学习率</label><input type="number" id="scratch-lr" class="input-styled" value="0.001" step="0.0001"></div>
        <div class="field" style="flex:1;"><label>Epochs</label><input type="number" id="scratch-epochs" class="input-styled" value="10" min="1"></div>
        <div class="field" style="flex:1;"><label>Batch Size</label><input type="number" id="scratch-batch" class="input-styled" value="8" min="1"></div>
      </div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>优化器</label><select id="scratch-optimizer" class="select-styled"><option value="adamw">AdamW</option><option value="adam">Adam</option><option value="sgd">SGD</option></select></div>
        <div class="field" style="flex:1;"><label>权重衰减</label><input type="number" id="scratch-weight-decay" class="input-styled" value="0.01" step="0.001"></div>
        <div class="field" style="flex:1;"><label>预热步数</label><input type="number" id="scratch-warmup" class="input-styled" value="500" min="0"></div>
      </div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>梯度累积</label><input type="number" id="scratch-grad-accum" class="input-styled" value="1" min="1"></div>
        <div class="field" style="flex:1;"><label>最大步数 (0=不限)</label><input type="number" id="scratch-max-steps" class="input-styled" value="0" min="0"></div>
      </div>
    </section>
    <div class="global-actions"><button id="start-scratch-training-btn" class="btn-save">开始训练</button></div>
  </div>
</div>

<!-- ============ View: Training Finetune ============ -->
<div class="view" id="view-training-finetune">
  <header class="view-header"><h1>模型微调</h1><p class="view-desc">选择基座模型和数据集，配置 LoRA 参数以开始微调</p></header>
  <div class="settings-body">
    <section class="card training-deps-missing" style="display:none;border-color:rgba(245,158,11,0.4);background:rgba(245,158,11,0.05);">
      <div style="display:flex;align-items:center;gap:0.75rem;"><span style="font-size:1.2rem;">⚠️</span>
        <div style="flex:1;"><strong>训练依赖未安装</strong><div class="training-deps-msg" style="font-size:0.78rem;color:var(--text-secondary);margin-top:0.15rem;"></div></div>
        <button class="btn-primary training-deps-install" style="white-space:nowrap;">一键安装</button>
      </div>
      <div class="training-deps-progress" style="display:none;margin-top:0.5rem;">
        <div class="training-deps-label" style="font-size:0.78rem;"></div>
        <div style="height:4px;background:var(--border-color);border-radius:2px;margin-top:0.3rem;"><div class="training-deps-bar" style="width:0%;height:100%;background:var(--theme-color);border-radius:2px;transition:width 0.3s;"></div></div>
      </div>
    </section>
    <section class="card"><div class="card-header"><h2>基座模型</h2></div>
      <div class="field"><label>选择模型</label><select id="finetune-base-model" class="select-styled" onchange="onBaseModelSelected()"><option value="">加载中...</option></select></div>
    </section>
    <section class="card" id="model-structure-card" style="display:none;">
      <div class="card-header"><h2>模型结构</h2><p class="card-desc" id="model-structure-info"></p></div>
      <div id="model-structure-viz" style="padding:0.5rem 0;"></div>
      <div style="border-top:1px solid var(--border-color);padding-top:0.75rem;margin-top:0.5rem;">
        <label style="font-weight:600;font-size:0.82rem;">微调范围</label>
        <div style="display:flex;gap:0.5rem;margin-top:0.4rem;flex-wrap:wrap;">
          <button class="arch-option selected" data-finetune-scope="all">全部参数</button>
          <button class="arch-option" data-finetune-scope="lora_attn">仅注意力 (LoRA)</button>
          <button class="arch-option" data-finetune-scope="lora_all">全部线性层 (LoRA)</button>
          <button class="arch-option" data-finetune-scope="lora_custom">自定义选择</button>
        </div>
      </div>
      <div id="custom-finetune-modules" style="display:none;margin-top:0.5rem;max-height:200px;overflow-y:auto;"></div>
    </section>
    <section class="card"><div class="card-header"><h2>数据集</h2></div>
      <div class="field"><label>选择数据集</label><select id="finetune-dataset" class="select-styled"><option value="">加载中...</option></select></div>
    </section>
    <section class="card">
      <div class="card-header"><h2>LoRA 配置</h2></div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>Rank (r)</label><input type="number" id="lora-rank" class="input-styled" value="8" min="1"></div>
        <div class="field" style="flex:1;"><label>Alpha</label><input type="number" id="lora-alpha" class="input-styled" value="16" min="1"></div>
        <div class="field" style="flex:1;"><label>Dropout</label><input type="number" id="lora-dropout" class="input-styled" value="0.05" min="0" max="1" step="0.01"></div>
      </div>
      <div class="field"><label>目标模块 (逗号分隔)</label><input type="text" id="lora-targets" class="input-styled" value="q_proj, v_proj"></div>
    </section>
    <section class="card">
      <div class="card-header"><h2>训练参数</h2></div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>学习率</label><input type="number" id="train-lr" class="input-styled" value="0.0002" step="0.0001"></div>
        <div class="field" style="flex:1;"><label>Epochs</label><input type="number" id="train-epochs" class="input-styled" value="3" min="1"></div>
        <div class="field" style="flex:1;"><label>Batch Size</label><input type="number" id="train-batch" class="input-styled" value="4" min="1"></div>
      </div>
      <div class="model-row" style="gap:1rem;">
        <div class="field" style="flex:1;"><label>梯度累积</label><input type="number" id="train-grad-accum" class="input-styled" value="1" min="1"></div>
        <div class="field" style="flex:1;"><label>最大步数 (0=不限)</label><input type="number" id="train-max-steps" class="input-styled" value="0" min="0"></div>
      </div>
    </section>
    <div class="global-actions"><button id="start-training-btn" class="btn-save">开始训练</button></div>
  </div>
</div>

<!-- ============ View: Training Monitor ============ -->
<div class="view" id="view-training-monitor">
  <header class="view-header"><h1>训练监控</h1><p class="view-desc" id="monitor-run-name">当前运行: 未选择</p></header>
  <div class="training-monitor-body">
    <section class="card" id="monitor-control-card">
      <div class="card-header"><h2>控制面板</h2></div>
      <div class="field" style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
        <button id="monitor-pause-btn" class="btn-secondary">停</button>
        <button id="monitor-resume-btn" class="btn-primary" style="display:none;">继续</button>
        <button id="monitor-step-btn" class="btn-secondary">单步</button>
        <button id="monitor-abort-btn" class="btn-secondary" style="color:var(--error)">中止</button>
        <button id="monitor-abort-save-btn" class="btn-secondary" style="color:#f59e0b;">中止并保存</button>
        <button id="monitor-test-btn" class="btn-primary" style="display:none;">🧪 测试模型</button>
        <span id="monitor-status-badge" class="task-type-badge">空闲</span>
      </div>
    </section>
    <section class="card"><div class="card-header"><h2>损失曲线</h2></div>
      <div class="field"><canvas id="loss-chart-canvas" style="width:100%;height:280px;background:var(--bg-panel);border-radius:var(--radius-sm);"></canvas></div>
      <div id="loss-chart-legend" style="font-size:0.75rem;color:var(--text-secondary);text-align:center;margin-top:0.25rem;"></div>
    </section>
    <section class="card">
      <div class="card-header"><h2>当前批次</h2></div>
      <div class="model-row" style="gap:1.5rem;flex-wrap:wrap;">
        <div class="stat-display"><label>Loss</label><span id="monitor-loss" class="stat-value">--</span></div>
        <div class="stat-display"><label>Grad Norm</label><span id="monitor-grad-norm" class="stat-value">--</span></div>
        <div class="stat-display"><label>LR</label><span id="monitor-lr" class="stat-value">--</span></div>
        <div class="stat-display"><label>Epoch</label><span id="monitor-epoch" class="stat-value">--</span></div>
        <div class="stat-display"><label>Step</label><span id="monitor-step" class="stat-value">--</span></div>
      </div>
      <div class="model-row" style="gap:1.5rem;flex-wrap:wrap;margin-top:0.8rem;padding-top:0.6rem;border-top:1px solid var(--border-color);">
        <div class="stat-display"><label>Val Loss</label><span id="monitor-val-loss" class="stat-value" style="color:#f59e0b;">--</span></div>
        <div class="stat-display"><label>Val PPL</label><span id="monitor-val-ppl" class="stat-value" style="color:#f59e0b;font-size:1.2rem;">--</span></div>
      </div>
    </section>
    <section class="card"><div class="card-header"><h2>逐层激活统计</h2></div>
      <div id="activation-stats-container"><div class="empty-state"><p>等待训练开始...</p></div></div>
    </section>
  </div>
</div>

<!-- ============ View: Training History ============ -->
<div class="view" id="view-training-history">
  <header class="view-header"><h1>训练历史</h1><p class="view-desc">查看过去的训练运行及其指标</p></header>
  <div class="settings-body">
    <section class="card"><div class="card-header"><h2>训练运行记录</h2></div>
      <div id="training-runs-list"><div class="empty-state"><p>暂无训练记录</p></div></div>
    </section>
  </div>
</div>

<!-- ============ View: Training Benchmark ============ -->
<div class="view" id="view-training-benchmark">
  <header class="view-header"><h1>模型测评</h1><p class="view-desc">对在线或本地大模型进行多维度性能测评</p></header>
  <div class="settings-body">
    <section class="card"><div class="card-header"><h2>测评数据集</h2><p class="card-desc">下载后测评将使用真实数据集而非在线获取</p></div>
      <div id="benchmark-download-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:0.5rem;"></div>
    </section>
    <section class="card">
      <div class="card-header"><h2>测评配置</h2></div>
      <div class="field"><label>选择模型</label><select id="bench-model-select" class="select-styled"><option value="">加载中...</option></select></div>
      <div class="field"><label>测评类型</label>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.4rem;margin-top:0.3rem;">
          <label class="finetune-module-check"><input type="checkbox" value="mmlu" checked> MMLU 多任务理解 (~100题)</label>
          <label class="finetune-module-check"><input type="checkbox" value="hellaswag" checked> HellaSwag 常识推理 (~50题)</label>
          <label class="finetune-module-check"><input type="checkbox" value="hle"> HLE 极限推理 (~20题)</label>
          <label class="finetune-module-check"><input type="checkbox" value="swe_bench"> SWE-bench 软件工程 (~10题)</label>
          <label class="finetune-module-check"><input type="checkbox" value="latency" checked> 延迟测试 (5题)</label>
        </div>
      </div>
      <button id="run-benchmark-btn" class="btn-primary" style="margin-top:0.5rem;">开始测评</button>
      <div id="benchmark-resume-container" style="margin-top:0.5rem;"></div>
    </section>
    <section class="card" id="benchmark-progress-card" style="display:none;">
      <div class="card-header"><h2>测评进度</h2></div>
      <div id="benchmark-progress-container"><div class="field-hint">准备中...</div></div>
    </section>
    <section class="card" id="benchmark-results-card" style="display:none;">
      <div class="card-header"><h2>测评结果</h2></div>
      <div id="benchmark-results-content"></div>
    </section>
    <section class="card"><div class="card-header"><h2>历史测评</h2></div>
      <div id="benchmark-history-list"><div class="empty-state"><p>暂无测评记录</p></div></div>
    </section>
  </div>
</div>
`;

  // =============================================
  // Inject views into main content area
  // =============================================
  function injectViews() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
      setTimeout(injectViews, 100);
      return;
    }
    mainContent.insertAdjacentHTML('beforeend', viewsHTML);
  }

  // =============================================
  // Training data-loading functions
  // =============================================
  var _trainingInited = false;
  var _activeRunId = null;
  const API_BASE = '/api/training';

  function escapeHtml(text) {
    var d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  function apiFetch(url) {
    return fetch(API_BASE + url).then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function showStatus(msg, type) {
    var el = document.getElementById('global-status-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'global-status-toast';
      el.style.cssText = 'position:fixed; top:1rem; left:50%; transform:translateX(-50%); z-index:9999;'
        + 'padding:0.6rem 1.2rem; border-radius:8px; font-size:0.85rem; font-weight:500;'
        + 'pointer-events:none; transition:opacity 0.3s; white-space:nowrap;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--surface)';
    el.style.color = type === 'success' || type === 'error' ? '#fff' : 'var(--text-primary)';
    el.style.opacity = '1';
    clearTimeout(el._timeout);
    el._timeout = setTimeout(function() { el.style.opacity = '0'; }, 3000);
  }

  function checkAndOfferTrainingInstall() {
    apiFetch('/status').then(function(data) {
      var hidden = data.available ? 'none' : '';
      document.querySelectorAll('.training-deps-missing').forEach(function(c) { c.style.display = hidden; });
      document.querySelectorAll('.training-deps-msg').forEach(function(el) { el.textContent = data.import_error || ''; });
      var dsCard = document.getElementById('training-deps-missing-card');
      if (dsCard) dsCard.style.display = hidden;
      var dsMsg = document.getElementById('training-deps-missing-msg');
      if (dsMsg) dsMsg.textContent = data.import_error || '';
    }).catch(function() {});
  }

  function populateSelect(id, items, labelKey, valueKey, emptyMsg) {
    var sel = document.getElementById(id);
    if (!sel) return;
    if (!items || items.length === 0) {
      sel.innerHTML = '<option value="">' + (emptyMsg || '无可用选项') + '</option>';
      return;
    }
    sel.innerHTML = '<option value="">请选择</option>'
      + items.map(function(item) {
        var val = item[valueKey || 'id'];
        var label = item[labelKey || 'name'];
        return '<option value="' + val + '">' + escapeHtml(String(label)) + '</option>';
      }).join('');
  }

  window.loadModelConfigs = function () {
    if (!_trainingInited) return;
    apiFetch('/model-configs').then(function(data) {
      var list = document.getElementById('saved-configs-list');
      if (!list) return;
      var configs = data.configs || [];
      if (configs.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>暂无保存的配置</p></div>';
        return;
      }
      list.innerHTML = configs.map(function(c) {
        var arch = c.architecture || 'unknown';
        var params = c.param_count_estimate
          ? (c.param_count_estimate / 1e6).toFixed(1) + 'M'
          : '?';
        return '<div class="config-item" style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem;border:1px solid var(--border-color);border-radius:6px;margin-bottom:0.4rem;">'
          + '<div><strong>' + escapeHtml(c.name) + '</strong><br>'
          + '<span style="font-size:0.72rem;color:var(--text-secondary);">' + arch + ' · ' + params + '</span></div>'
          + '<div style="display:flex;gap:0.3rem;">'
          + '<button class="btn-secondary load-config-btn" data-id="' + c.id + '" style="font-size:0.7rem;padding:0.2rem 0.5rem;">加载</button>'
          + '<button class="btn-secondary delete-config-btn" data-id="' + c.id + '" style="font-size:0.7rem;padding:0.2rem 0.5rem;color:var(--error);">删除</button>'
          + '</div></div>';
      }).join('');
    }).catch(function() {});
  };

  window.loadDatasets = function () {
    if (!_trainingInited) return;

    apiFetch('/datasets').then(function(data) {
      var container = document.getElementById('dataset-list-container');
      if (!container) return;
      var datasets = data.datasets || [];
      if (datasets.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>暂无数据集</p></div>';
        return;
      }
      container.innerHTML = datasets.map(function(ds) {
        return '<div class="dataset-item" style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem;border:1px solid var(--border-color);border-radius:6px;margin-bottom:0.4rem;">'
          + '<div><strong>' + escapeHtml(ds.name) + '</strong><br>'
          + '<span style="font-size:0.72rem;color:var(--text-secondary);">' + (ds.sample_count || '?') + ' 条</span></div>'
          + '<button class="btn-secondary delete-dataset-btn" data-id="' + ds.id + '" style="font-size:0.7rem;padding:0.2rem 0.5rem;color:var(--error);">删除</button>'
          + '</div>';
      }).join('');
    }).catch(function() {});

    apiFetch('/recommended-datasets').then(function(data) {
      var grid = document.getElementById('recommended-datasets-grid');
      if (!grid) return;
      var datasets = data.datasets || [];
      if (datasets.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>暂无推荐数据集</p></div>';
        return;
      }
      grid.innerHTML = datasets.map(function(ds) {
        return '<div style="border:1px solid var(--border-color);border-radius:8px;padding:0.75rem;display:flex;flex-direction:column;gap:0.4rem;background:var(--bg-card-hover);">'
          + '<div style="font-weight:600;font-size:0.82rem;">' + escapeHtml(ds.name) + '</div>'
          + '<div style="font-size:0.72rem;color:var(--text-secondary);">' + escapeHtml(ds.desc || '') + '</div>'
          + '<div style="font-size:0.7rem;color:var(--text-secondary);">' + escapeHtml(ds.repo_id) + ' · ' + (ds.size || '') + '</div>'
          + '<button class="btn-primary download-recommended-ds-btn" data-repo="' + ds.repo_id + '" data-name="' + escapeHtml(ds.name) + '" style="font-size:0.72rem;padding:0.25rem 0.5rem;margin-top:0.25rem;">下载</button>'
          + '</div>';
      }).join('');
      // Populate scratch finetune dataset selects too if they exist
      populateSelect('scratch-dataset', datasets, 'name', 'id');
      populateSelect('finetune-dataset', datasets, 'name', 'id');
    }).catch(function() {
      var grid = document.getElementById('recommended-datasets-grid');
      if (grid) grid.innerHTML = '<div class="empty-state"><p>加载推荐数据集失败</p></div>';
    });
  };

  window.loadScratchTrainingData = function () {
    if (!_trainingInited) return;
    apiFetch('/model-configs').then(function(data) {
      var configs = data.configs || [];
      populateSelect('scratch-model-config', configs, 'name', 'id');
    }).catch(function() {});
    apiFetch('/datasets').then(function(data) {
      populateSelect('scratch-dataset', data.datasets, 'name', 'id');
    }).catch(function() {});
  };

  window.loadBaseModels = function () {
    if (!_trainingInited) return;
    apiFetch('/base-models').then(function(data) {
      var models = data.models || [];
      populateSelect('finetune-base-model', models, 'name', 'id');
    }).catch(function() {});
  };

  window.loadTrainingRuns = function () {
    if (!_trainingInited) return;
    apiFetch('/runs').then(function(data) {
      var list = document.getElementById('training-runs-list');
      if (!list) return;
      var runs = data.runs || [];
      if (runs.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>暂无训练记录</p></div>';
        return;
      }
      list.innerHTML = runs.map(function(r) {
        var statusColor = r.status === 'completed' ? 'var(--success)'
          : r.status === 'running' ? 'var(--theme-color)'
          : r.status === 'failed' || r.status === 'aborted' ? 'var(--error)'
          : 'var(--text-secondary)';
        return '<div style="border:1px solid var(--border-color);border-radius:6px;padding:0.6rem;margin-bottom:0.4rem;display:flex;justify-content:space-between;align-items:center;">'
          + '<div><strong>' + escapeHtml(r.name || ('Run #' + r.id)) + '</strong><br>'
          + '<span style="font-size:0.72rem;color:var(--text-secondary);">'
          + '<span style="color:' + statusColor + ';font-weight:500;">' + (r.status || 'unknown') + '</span>'
          + (r.created_at ? ' · ' + r.created_at : '') + '</span></div>'
          + '<button class="btn-secondary view-run-btn" data-id="' + r.id + '" style="font-size:0.7rem;padding:0.2rem 0.5rem;">查看</button>'
          + '</div>';
      }).join('');
    }).catch(function() {});
  };

  window.initTrainingMonitor = function () {
    if (!_trainingInited) return;
    apiFetch('/runs').then(function(data) {
      var runs = data.runs || [];
      // Find the most recent active or running run
      var active = runs.find(function(r) { return r.status === 'running' || r.status === 'paused'; })
        || runs.find(function(r) { return r.status === 'pending'; })
        || runs[0];
      if (active) {
        _activeRunId = active.id;
        var nameEl = document.getElementById('monitor-run-name');
        if (nameEl) nameEl.textContent = '当前运行: ' + (active.name || ('Run #' + active.id));
        var badge = document.getElementById('monitor-status-badge');
        if (badge) badge.textContent = active.status || 'idle';
      }
    }).catch(function() {});
  };

  window.loadBenchmarkView = function () {
    if (!_trainingInited) return;
    apiFetch('/all-models').then(function(data) {
      var models = data.models || [];
      populateSelect('bench-model-select', models, 'name', 'id', '无可用模型');
    }).catch(function() {});

    // Load benchmark cache status
    apiFetch('/benchmark/cache-status').then(function(data) {
      var dlList = document.getElementById('benchmark-download-list');
      if (!dlList) return;
      var items = [];
      if (data.mmlu) items.push({ type: 'mmlu', label: 'MMLU', cached: data.mmlu.cached, count: data.mmlu.count || 0 });
      if (data.hellaswag) items.push({ type: 'hellaswag', label: 'HellaSwag', cached: data.hellaswag.cached, count: data.hellaswag.count || 0 });
      if (data.hle) items.push({ type: 'hle', label: 'HLE', cached: data.hle.cached, count: data.hle.count || 0 });
      if (items.length === 0) {
        dlList.innerHTML = '<div class="empty-state"><p>暂无可用测评数据集</p></div>';
        return;
      }
      dlList.innerHTML = items.map(function(item) {
        return '<div style="border:1px solid var(--border-color);border-radius:6px;padding:0.5rem;display:flex;justify-content:space-between;align-items:center;">'
          + '<span style="font-size:0.82rem;">' + item.label + '</span>'
          + (item.cached
            ? '<span style="font-size:0.72rem;color:var(--success);">✓ 已缓存 (' + item.count + ' 题)</span>'
            : '<button class="btn-secondary pre-download-benchmark-btn" data-type="' + item.type + '" style="font-size:0.7rem;padding:0.2rem 0.5rem;">预下载</button>')
          + '</div>';
      }).join('');
    }).catch(function() {});

    // Load benchmark history
    apiFetch('/benchmarks').then(function(data) {
      var hist = document.getElementById('benchmark-history-list');
      if (!hist) return;
      var benches = data.benchmarks || [];
      if (benches.length === 0) {
        hist.innerHTML = '<div class="empty-state"><p>暂无测评记录</p></div>';
        return;
      }
      hist.innerHTML = benches.map(function(b) {
        return '<div style="border:1px solid var(--border-color);border-radius:6px;padding:0.5rem;margin-bottom:0.3rem;font-size:0.78rem;">'
          + '<strong>' + escapeHtml(b.benchmark_type || '') + '</strong> · '
          + 'Score: ' + (b.score || '--') + ' · '
          + (b.created_at || '') + '</div>';
      }).join('');
    }).catch(function() {});
  };

  // =============================================
  // WebSocket training event handlers
  // =============================================
  window.onScratchConfigSelected = function () {
    var sel = document.getElementById('scratch-model-config');
    var preview = document.getElementById('scratch-config-preview');
    if (!sel || !preview) return;
    var configId = sel.value;
    if (!configId) { preview.style.display = 'none'; return; }
    fetch(API_BASE + '/model-configs/' + configId).then(function(r) { return r.json(); }).then(function(config) {
      if (!config) return;
      preview.style.display = '';
      var archEl = document.getElementById('scratch-preview-arch');
      if (archEl) archEl.textContent = config.architecture || 'unknown';
      var paramsEl = document.getElementById('scratch-preview-params');
      if (paramsEl && config.param_count_estimate) paramsEl.textContent = (config.param_count_estimate / 1e6).toFixed(1) + 'M params';
      var layersEl = document.getElementById('scratch-preview-layers');
      if (layersEl) {
        var cj = typeof config.config_json === 'string' ? JSON.parse(config.config_json) : (config.config_json || {});
        layersEl.textContent = (cj.num_layers || '?') + ' layers';
      }
      var jsonEl = document.getElementById('scratch-config-json');
      if (jsonEl) jsonEl.textContent = JSON.stringify(config, null, 2);
    }).catch(function() { preview.style.display = 'none'; });
  };

  window.onBaseModelSelected = function () {
    var sel = document.getElementById('finetune-base-model');
    var card = document.getElementById('model-structure-card');
    if (!sel || !card) return;
    var modelId = sel.value;
    if (!modelId) { card.style.display = 'none'; return; }
    card.style.display = '';
    var infoEl = document.getElementById('model-structure-info');
    if (infoEl) infoEl.textContent = '已选择: ' + (sel.options[sel.selectedIndex]?.text || modelId);
  };

  window.handleTrainingProgress = function (data) {
    var lossEl = document.getElementById('monitor-loss');
    if (lossEl) lossEl.textContent = data.loss != null ? data.loss.toFixed(4) : '--';
    var gradNormEl = document.getElementById('monitor-grad-norm');
    if (gradNormEl) gradNormEl.textContent = data.grad_norm != null ? data.grad_norm.toFixed(4) : '--';
    var lrEl = document.getElementById('monitor-lr');
    if (lrEl) lrEl.textContent = data.lr != null ? data.lr.toExponential(2) : '--';
    var epochEl = document.getElementById('monitor-epoch');
    if (epochEl) epochEl.textContent = data.epoch != null ? data.epoch : '--';
    var stepEl = document.getElementById('monitor-step');
    if (stepEl) stepEl.textContent = data.step != null ? data.step : '--';
    var valLossEl = document.getElementById('monitor-val-loss');
    if (valLossEl) valLossEl.textContent = data.val_loss != null ? data.val_loss.toFixed(4) : '--';
    var valPplEl = document.getElementById('monitor-val-ppl');
    if (valPplEl) valPplEl.textContent = data.val_ppl != null ? data.val_ppl.toFixed(2) : '--';
    var badge = document.getElementById('monitor-status-badge');
    if (badge) badge.textContent = 'running';
  };

  window.handleTrainingStepPaused = function (data) {
    var badge = document.getElementById('monitor-status-badge');
    if (badge) badge.textContent = 'paused';
    showStatus('训练已暂停', '');
  };

  window.handleTrainingComplete = function (data) {
    var badge = document.getElementById('monitor-status-badge');
    if (badge) badge.textContent = 'completed';
    showStatus('训练完成!', 'success');
    if (typeof window.loadTrainingRuns === 'function') window.loadTrainingRuns();
  };

  window.handleTrainingError = function (data) {
    var badge = document.getElementById('monitor-status-badge');
    if (badge) badge.textContent = 'error';
    showStatus('训练出错: ' + (data.message || '未知错误'), 'error');
    if (typeof window.loadTrainingRuns === 'function') window.loadTrainingRuns();
  };

  window.handleInstallProgress = function (data) {
    var label = document.getElementById('training-deps-install-label');
    if (label) label.textContent = data.label || '正在安装...';
    var bar = document.getElementById('training-deps-install-bar');
    if (bar) bar.style.width = (data.progress || 0) + '%';
    var progress = document.getElementById('training-deps-install-progress');
    if (progress) progress.style.display = '';
    // Also update generic install progress elements
    document.querySelectorAll('.training-deps-label').forEach(function(el) { el.textContent = data.label || ''; });
    document.querySelectorAll('.training-deps-bar').forEach(function(el) { el.style.width = (data.progress || 0) + '%'; });
    document.querySelectorAll('.training-deps-progress').forEach(function(el) { el.style.display = ''; });
  };

  window.handleBenchmarkProgress = function (data) {
    var progContainer = document.getElementById('benchmark-progress-container');
    if (!progContainer) return;
    progContainer.innerHTML = '<div style="font-size:0.82rem;">' + escapeHtml(data.status || '') + '</div>'
      + '<div style="height:4px;background:var(--border-color);border-radius:2px;margin-top:0.3rem;">'
      + '<div style="width:' + (data.progress || 0) + '%;height:100%;background:var(--theme-color);border-radius:2px;transition:width 0.3s;"></div></div>';
    document.getElementById('benchmark-progress-card').style.display = '';
  };

  window.handleBenchmarkComplete = function (data) {
    var progContainer = document.getElementById('benchmark-progress-container');
    if (progContainer) progContainer.innerHTML = '<div style="color:var(--success);">测评完成</div>';
    showStatus('测评完成', 'success');
    if (typeof window.loadBenchmarkView === 'function') window.loadBenchmarkView();
  };

  // =============================================
  // Event binding
  // =============================================
  function bindEvents() {
    document.addEventListener('click', function(e) {
      // --- Training Designer ---
      // Save config
      if (e.target.id === 'save-model-config-btn') {
        var name = prompt('配置名称:');
        if (!name) return;
        var config = {
          num_layers: parseInt(document.getElementById('hp-num-layers').value) || 12,
          hidden_size: parseInt(document.getElementById('hp-hidden-size').value) || 768,
          num_attention_heads: parseInt(document.getElementById('hp-num-heads').value) || 12,
          intermediate_size: parseInt(document.getElementById('hp-intermediate').value) || 3072,
          vocab_size: parseInt(document.getElementById('hp-vocab-size').value) || 50000,
          max_seq_length: parseInt(document.getElementById('hp-max-seq').value) || 2048,
        };
        var archEl = document.querySelector('.arch-option.selected');
        var architecture = archEl ? archEl.dataset.arch : 'gpt_decoder';
        fetch(API_BASE + '/model-configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, architecture: architecture, config_json: JSON.stringify(config), param_count_estimate: 0 })
        }).then(function(r) { return r.json(); }).then(function() {
          showStatus('配置已保存', 'success');
          window.loadModelConfigs?.();
        }).catch(function() { showStatus('保存失败', 'error'); });
        return;
      }

      // Delete config
      if (e.target.classList.contains('delete-config-btn')) {
        if (!confirm('确定删除此配置?')) return;
        var id = e.target.dataset.id;
        fetch(API_BASE + '/model-configs/' + id, { method: 'DELETE' }).then(function() {
          showStatus('已删除', 'success');
          window.loadModelConfigs?.();
        }).catch(function() { showStatus('删除失败', 'error'); });
        return;
      }

      // Load config into form
      if (e.target.classList.contains('load-config-btn')) {
        var id = e.target.dataset.id;
        fetch(API_BASE + '/model-configs/' + id).then(function(r) { return r.json(); }).then(function(config) {
          if (!config) return;
          var cj = typeof config.config_json === 'string' ? JSON.parse(config.config_json) : (config.config_json || {});
          var setVal = function(id, val) {
            var el = document.getElementById(id);
            if (el && val != null) el.value = val;
          };
          setVal('hp-num-layers', cj.num_layers);
          setVal('hp-hidden-size', cj.hidden_size);
          setVal('hp-num-heads', cj.num_attention_heads);
          setVal('hp-intermediate', cj.intermediate_size);
          setVal('hp-vocab-size', cj.vocab_size);
          setVal('hp-max-seq', cj.max_seq_length);
          // Select correct architecture
          document.querySelectorAll('.arch-option').forEach(function(a) {
            a.classList.toggle('selected', a.dataset.arch === config.architecture);
          });
          showStatus('配置已加载', 'success');
        }).catch(function() { showStatus('加载配置失败', 'error'); });
        return;
      }

      // Estimate params
      if (e.target.id === 'estimate-model-btn') {
        var config = {
          num_layers: parseInt(document.getElementById('hp-num-layers').value) || 12,
          hidden_size: parseInt(document.getElementById('hp-hidden-size').value) || 768,
          num_attention_heads: parseInt(document.getElementById('hp-num-heads').value) || 12,
          intermediate_size: parseInt(document.getElementById('hp-intermediate').value) || 3072,
          vocab_size: parseInt(document.getElementById('hp-vocab-size').value) || 50000,
          max_seq_length: parseInt(document.getElementById('hp-max-seq').value) || 2048,
        };
        var archEl = document.querySelector('.arch-option.selected');
        var architecture = archEl ? archEl.dataset.arch : 'gpt_decoder';
        fetch(API_BASE + '/model-configs/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ architecture: architecture, config_json: JSON.stringify(config) })
        }).then(function(r) { return r.json(); }).then(function(data) {
          var preview = document.getElementById('model-preview-content');
          if (preview) {
            preview.innerHTML = '<div style="padding:0.5rem;background:var(--bg-card-hover);border-radius:6px;">'
              + '<div>参数量: <strong>' + (data.param_count ? (data.param_count / 1e6).toFixed(1) + 'M' : '?') + '</strong></div>'
              + '<div>训练内存估计: <strong>' + (data.memory_estimate || '?') + '</strong></div>'
              + '</div>';
          }
        }).catch(function() { showStatus('估算失败', 'error'); });
        return;
      }

      // --- Training Datasets ---
      // Download recommended dataset
      if (e.target.classList.contains('download-recommended-ds-btn')) {
        var repo = e.target.dataset.repo;
        var name = e.target.dataset.name;
        e.target.textContent = '下载中...';
        e.target.disabled = true;
        fetch('/api/downloads/dataset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_id: repo, name: name })
        }).then(function(r) { return r.json(); }).then(function(data) {
          if (data.status === 'started') {
            showStatus('开始下载: ' + name, 'success');
          } else {
            showStatus('下载完成', 'success');
            window.loadDatasets?.();
          }
        }).catch(function() {
          showStatus('下载失败', 'error');
          e.target.textContent = '下载';
          e.target.disabled = false;
        });
        return;
      }

      // Upload dataset
      if (e.target.id === 'ds-upload-btn') {
        var fileInput = document.getElementById('ds-file-input');
        var nameInput = document.getElementById('ds-upload-name');
        if (!fileInput || !fileInput.files || !fileInput.files[0]) {
          showStatus('请选择文件', 'error');
          return;
        }
        var formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('name', nameInput.value || fileInput.files[0].name);
        fetch(API_BASE + '/datasets/upload', { method: 'POST', body: formData })
        .then(function(r) { return r.json(); }).then(function() {
          showStatus('上传成功', 'success');
          window.loadDatasets?.();
        }).catch(function() { showStatus('上传失败', 'error'); });
        return;
      }

      // Create dataset from editor
      if (e.target.id === 'ds-editor-save') {
        var dsName = document.getElementById('ds-editor-name');
        var dsContent = document.getElementById('ds-editor-content');
        if (!dsName || !dsName.value) { showStatus('请输入数据集名称', 'error'); return; }
        if (!dsContent || !dsContent.value) { showStatus('请输入数据集内容', 'error'); return; }
        fetch(API_BASE + '/datasets/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: dsName.value, samples: dsContent.value })
        }).then(function(r) { return r.json(); }).then(function() {
          showStatus('数据集已创建', 'success');
          dsName.value = '';
          dsContent.value = '';
          window.loadDatasets?.();
        }).catch(function() { showStatus('创建失败', 'error'); });
        return;
      }

      // Validate JSON in editor
      if (e.target.id === 'ds-editor-validate') {
        var content = document.getElementById('ds-editor-content');
        var status = document.getElementById('ds-editor-status');
        if (!content || !status) return;
        var lines = content.value.split('\n').filter(function(l) { return l.trim(); });
        var valid = 0, invalid = 0;
        lines.forEach(function(line) {
          try { JSON.parse(line); valid++; } catch (e) { invalid++; }
        });
        status.textContent = '验证结果: ' + valid + ' 行有效, ' + invalid + ' 行无效';
        status.style.color = invalid === 0 ? 'var(--success)' : 'var(--error)';
        return;
      }

      // Add sample template
      if (e.target.id === 'ds-editor-add-sample') {
        var ta = document.getElementById('ds-editor-content');
        if (ta) {
          ta.value += (ta.value ? '\n' : '') + '{"instruction": "你好", "output": "你好!有什么我可以帮助你的吗?"}';
        }
        return;
      }

      // Import HF custom dataset
      if (e.target.id === 'ds-hf-import-btn') {
        var input = document.getElementById('ds-hf-custom');
        if (!input || !input.value) { showStatus('请输入 HuggingFace 仓库 ID', 'error'); return; }
        fetch('/api/downloads/dataset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_id: input.value, name: input.value })
        }).then(function(r) { return r.json(); }).then(function() {
          showStatus('开始下载', 'success');
        }).catch(function() { showStatus('下载失败', 'error'); });
        return;
      }

      // Delete dataset
      if (e.target.classList.contains('delete-dataset-btn')) {
        if (!confirm('确定删除此数据集?')) return;
        var dsId = e.target.dataset.id;
        fetch(API_BASE + '/datasets/' + dsId, { method: 'DELETE' }).then(function() {
          showStatus('已删除', 'success');
          window.loadDatasets?.();
        }).catch(function() { showStatus('删除失败', 'error'); });
        return;
      }

      // --- Install Training Dependencies ---
      if (e.target.classList.contains('training-deps-install') || e.target.id === 'training-deps-install-btn') {
        fetch('/api/training/install-deps', { method: 'POST' })
        .then(function(r) { return r.json(); }).then(function(data) {
          if (data.status === 'started') showStatus('正在安装训练依赖...', '');
          else showStatus(data.message || '安装已开始', '');
        }).catch(function() { showStatus('安装失败', 'error'); });
        return;
      }

      // --- Training Scratch ---
      if (e.target.id === 'start-scratch-training-btn') {
        var configId = document.getElementById('scratch-model-config').value;
        var datasetId = document.getElementById('scratch-dataset').value;
        if (!configId || !datasetId) { showStatus('请选择配置和数据集', 'error'); return; }
        var params = {
          learning_rate: parseFloat(document.getElementById('scratch-lr').value) || 0.001,
          num_epochs: parseInt(document.getElementById('scratch-epochs').value) || 10,
          batch_size: parseInt(document.getElementById('scratch-batch').value) || 8,
          optimizer: document.getElementById('scratch-optimizer').value || 'adamw',
          weight_decay: parseFloat(document.getElementById('scratch-weight-decay').value) || 0.01,
          warmup_steps: parseInt(document.getElementById('scratch-warmup').value) || 500,
          gradient_accumulation_steps: parseInt(document.getElementById('scratch-grad-accum').value) || 1,
          max_steps: parseInt(document.getElementById('scratch-max-steps').value) || 0,
        };
        fetch(API_BASE + '/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'scratch_' + new Date().toISOString().slice(0, 16),
            model_config_id: parseInt(configId),
            dataset_id: parseInt(datasetId),
            base_model_id: null,
            base_model_source: 'scratch',
            training_params_json: JSON.stringify(params)
          })
        }).then(function(r) { return r.json(); }).then(function(data) {
          showStatus('训练已创建', 'success');
        }).catch(function() { showStatus('创建训练失败', 'error'); });
        return;
      }

      // --- Training Finetune ---
      if (e.target.id === 'start-training-btn') {
        var modelId = document.getElementById('finetune-base-model').value;
        var datasetId = document.getElementById('finetune-dataset').value;
        if (!modelId || !datasetId) { showStatus('请选择模型和数据集', 'error'); return; }
        var params = {
          learning_rate: parseFloat(document.getElementById('train-lr').value) || 0.0002,
          num_epochs: parseInt(document.getElementById('train-epochs').value) || 3,
          batch_size: parseInt(document.getElementById('train-batch').value) || 4,
          gradient_accumulation_steps: parseInt(document.getElementById('train-grad-accum').value) || 1,
          max_steps: parseInt(document.getElementById('train-max-steps').value) || 0,
          lora_r: parseInt(document.getElementById('lora-rank').value) || 8,
          lora_alpha: parseInt(document.getElementById('lora-alpha').value) || 16,
          lora_dropout: parseFloat(document.getElementById('lora-dropout').value) || 0.05,
          lora_target_modules: document.getElementById('lora-targets').value || 'q_proj, v_proj',
        };
        fetch(API_BASE + '/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'finetune_' + new Date().toISOString().slice(0, 16),
            model_config_id: null,
            dataset_id: parseInt(datasetId),
            base_model_id: modelId,
            base_model_source: 'gguf',
            training_params_json: JSON.stringify(params)
          })
        }).then(function(r) { return r.json(); }).then(function() {
          showStatus('微调已开始', 'success');
        }).catch(function() { showStatus('启动微调失败', 'error'); });
        return;
      }

      // --- Training Monitor ---
      if (e.target.id === 'monitor-pause-btn' && _activeRunId) {
        fetch(API_BASE + '/runs/' + _activeRunId + '/pause', { method: 'POST' }).catch(function() {});
        return;
      }
      if (e.target.id === 'monitor-resume-btn' && _activeRunId) {
        fetch(API_BASE + '/runs/' + _activeRunId + '/resume', { method: 'POST' }).catch(function() {});
        return;
      }
      if (e.target.id === 'monitor-step-btn' && _activeRunId) {
        fetch(API_BASE + '/runs/' + _activeRunId + '/step', { method: 'POST' }).catch(function() {});
        return;
      }
      if (e.target.id === 'monitor-abort-btn' && _activeRunId) {
        if (!confirm('确定中止训练?')) return;
        fetch(API_BASE + '/runs/' + _activeRunId + '/abort', { method: 'POST' }).catch(function() {});
        return;
      }
      if (e.target.id === 'monitor-abort-save-btn' && _activeRunId) {
        if (!confirm('确定中止并保存?')) return;
        fetch(API_BASE + '/runs/' + _activeRunId + '/abort_save', { method: 'POST' }).catch(function() {});
        return;
      }

      // --- Training Benchmark ---
      if (e.target.classList.contains('pre-download-benchmark-btn')) {
        var type = e.target.dataset.type;
        e.target.disabled = true;
        e.target.textContent = '下载中...';
        fetch(API_BASE + '/benchmark/pre-download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ benchmark_type: type, sample_size: 100 })
        }).then(function(r) { return r.json(); }).then(function() {
          showStatus('下载完成', 'success');
          window.loadBenchmarkView?.();
        }).catch(function() { showStatus('下载失败', 'error'); e.target.disabled = false; e.target.textContent = '预下载'; });
        return;
      }

      if (e.target.id === 'run-benchmark-btn') {
        var modelId = document.getElementById('bench-model-select').value;
        if (!modelId) { showStatus('请选择模型', 'error'); return; }
        var types = [];
        document.querySelectorAll('.finetune-module-check input[type="checkbox"]').forEach(function(cb) {
          if (cb.checked) types.push(cb.value);
        });
        fetch(API_BASE + '/benchmark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_id: modelId, benchmark_types: types.length > 0 ? types : ['mmlu'] })
        }).then(function(r) { return r.json(); }).then(function() {
          showStatus('测评已启动', 'success');
        }).catch(function() { showStatus('启动测评失败', 'error'); });
        return;
      }

      // View training run details
      if (e.target.classList.contains('view-run-btn')) {
        var runId = e.target.dataset.id;
        // Switch to monitor view with this run loaded
        var monBtn = document.querySelector('[data-view="training-monitor"]');
        if (monBtn) {
          _activeRunId = parseInt(runId);
          (window.switchView || Function)(monBtn.dataset.view);
        }
        return;
      }
    });
  }

  // =============================================
  // Hook into navigation view switching
  // =============================================
  function hookSwitchView() {
    var origSwitchView = window.switchView;
    if (!origSwitchView) {
      setTimeout(hookSwitchView, 200);
      return;
    }

    window.switchView = function (viewId) {
      origSwitchView(viewId);
      if (viewId === 'training-designer') { window.loadModelConfigs?.(); checkAndOfferTrainingInstall(); }
      else if (viewId === 'training-datasets') { window.loadDatasets?.(); checkAndOfferTrainingInstall(); }
      else if (viewId === 'training-scratch') { window.loadScratchTrainingData?.(); checkAndOfferTrainingInstall(); }
      else if (viewId === 'training-finetune') { window.loadBaseModels?.(); window.loadDatasets?.(); checkAndOfferTrainingInstall(); }
      else if (viewId === 'training-history') { window.loadTrainingRuns?.(); checkAndOfferTrainingInstall(); }
      else if (viewId === 'training-monitor') { window.initTrainingMonitor?.(); checkAndOfferTrainingInstall(); }
      else if (viewId === 'training-benchmark') { window.loadBenchmarkView?.(); checkAndOfferTrainingInstall(); }
    };
  }

  // =============================================
  // Init
  // =============================================
  injectViews();
  hookSwitchView();
  bindEvents();
  _trainingInited = true;
})();
