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
      <div class="model-row" style="gap:1rem;display:none;" id="moe-fields">
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
        <div class="field" style="flex:1;display:none;" id="gqa-kv-field">
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

<!-- ============ Dataset Preview Modal ============ -->
<div class="modal-overlay" id="dataset-preview-modal" style="display:none;">
  <div class="modal-box" style="max-width:700px;width:95%;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;">
      <h3 style="margin:0;">📊 数据集预览</h3>
      <button class="icon-btn" id="dataset-preview-close" title="关闭" style="margin-top:-4px;margin-right:-8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div id="dataset-preview-desc" style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:0.5rem;"></div>
    <div id="dataset-preview-samples" style="max-height:60vh;overflow-y:auto;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:8px;padding:0.8rem;"></div>
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
      <div id="monitor-progress-container" style="display:none;margin-top:0.75rem;padding:0.5rem;background:var(--bg-card-hover);border-radius:6px;">
        <div style="display:flex;justify-content:space-between;font-size:0.78rem;">
          <span id="monitor-stage-label">正在分词...</span>
          <span id="monitor-stage-percent">0%</span>
        </div>
        <div style="height:6px;background:var(--border-color);border-radius:3px;margin-top:0.3rem;">
          <div id="monitor-progress-bar" style="width:0%;height:100%;background:var(--theme-color);border-radius:3px;transition:width 0.3s;"></div>
        </div>
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
    <section class="card">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
        <h2>逐层统计</h2>
        <label style="font-size:0.75rem;display:flex;align-items:center;gap:0.3rem;cursor:pointer;">
          <input type="checkbox" id="layer-stats-toggle" checked onchange="toggleLayerStats()"> 实时热力图
        </label>
      </div>
      <div id="activation-stats-container"><div class="empty-state"><p>等待训练开始...</p></div></div>
      <div id="layer-detail-panel" style="display:none;margin-top:0.5rem;padding:0.5rem;background:var(--bg-card-hover);border-radius:6px;font-size:0.75rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem;">
          <strong id="layer-detail-name"></strong>
          <button onclick="document.getElementById('layer-detail-panel').style.display='none'" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:1rem;">&times;</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.25rem 1rem;" id="layer-detail-grid"></div>
      </div>
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
      <div style="margin-top:0.5rem;display:flex;gap:0.5rem;">
        <button id="benchmark-abort-btn" class="btn-secondary" style="color:var(--error);border-color:var(--error);font-size:0.78rem;">中断测评</button>
      </div>
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
  var _currentDatasets = [];
  var _benchmarkRunning = false;
  var _currentTestRunId = null;
  var _lossData = [];
  var _valLossData = [];
  const API_BASE = '/api/plugin/open-agc-train';

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

  // ── Datasets ──

  function renderRecommendedDatasets(datasets) {
    var grid = document.getElementById('recommended-datasets-grid');
    if (!grid) return;
    if (datasets.length === 0) {
      grid.innerHTML = '<div class="empty-state"><p>暂无推荐数据集</p></div>';
      return;
    }
    grid.innerHTML = datasets.map(function(d) {
      var isDownloaded = _currentDatasets.some(function(cd) { return cd.name === d.name; });
      return '<div class="rec-ds-card" style="border:1px solid var(--border-color);border-radius:8px;padding:0.75rem;display:flex;flex-direction:column;gap:0.4rem;background:var(--bg-card-hover);">'
        + '<div style="font-weight:600;font-size:0.82rem;">📦 ' + escapeHtml(d.name) + '</div>'
        + '<div style="font-size:0.72rem;color:var(--text-secondary);">' + escapeHtml(d.desc || '') + '</div>'
        + '<div style="font-size:0.7rem;color:var(--text-secondary);">' + escapeHtml(d.repo_id) + ' · ' + (d.size || '') + ' · ' + (d.splits || []).join(', ') + '</div>'
        + '<button class="btn-secondary rec-ds-dl-btn" data-repo="' + d.repo_id + '" data-name="' + escapeHtml(d.name) + '" data-config="' + (d.config || '') + '" style="margin-top:0.4rem;width:100%;font-size:0.75rem;padding:0.3rem 0.5rem;" ' + (isDownloaded ? 'disabled' : '') + '>' + (isDownloaded ? '✓ 已下载' : '一键下载') + '</button>'
        + '</div>';
    }).join('');
    // Wire download buttons
    grid.querySelectorAll('.rec-ds-dl-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { downloadRecommendedDataset(this.dataset.repo, this.dataset.name, this.dataset.config, this); });
    });
  }

  function downloadRecommendedDataset(repoId, dsName, dsConfig, btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = '获取文件列表...';

    function startDownload(split, targetFile, config) {
      btnEl.textContent = '下载中...';
      fetch('/api/downloads/dataset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_id: repoId, name: dsName, split: split || 'train', target_file: targetFile || null, config: config || null })
      }).then(function(r) { return r.json(); }).then(function(d) {
        if (d.status === 'started') showStatus('📥 ' + (d.message || '开始下载'), 'success');
        else showStatus('❌ ' + (d.detail || '下载失败'), 'error');
        btnEl.disabled = false;
        btnEl.textContent = '一键下载';
      }).catch(function() {
        showStatus('❌ 网络错误', 'error');
        btnEl.disabled = false;
        btnEl.textContent = '一键下载';
      });
    }

    // Check config first
    if (!dsConfig) {
      fetch('/api/downloads/dataset-configs/' + encodeURIComponent(repoId)).then(function(r) {
        if (r.ok) return r.json();
        return null;
      }).then(function(cfgData) {
        if (cfgData && cfgData.needs_config && cfgData.configs.length > 0) {
          showConfigSelectionPopup(cfgData, repoId, dsName, btnEl, startDownload);
          return;
        }
        return checkFilesAndDownload(repoId, dsName, dsConfig, btnEl, startDownload);
      }).catch(function() {
        checkFilesAndDownload(repoId, dsName, dsConfig, btnEl, startDownload);
      });
    } else {
      checkFilesAndDownload(repoId, dsName, dsConfig, btnEl, startDownload);
    }
  }

  function checkFilesAndDownload(repoId, dsName, dsConfig, btnEl, startDownload) {
    fetch('/api/downloads/dataset-files/' + encodeURIComponent(repoId) + '?config=' + encodeURIComponent(dsConfig || '')).then(function(r) {
      if (r.ok) return r.json();
      return null;
    }).then(function(filesData) {
      if (filesData && filesData.total_files > 1) {
        btnEl.disabled = false;
        btnEl.textContent = '一键下载';
        showDatasetFilePopup(filesData, repoId, dsName, dsConfig, startDownload);
      } else if (filesData && filesData.total_files === 1) {
        startDownload(filesData.all_files[0].split, filesData.all_files[0].rfilename, dsConfig);
      } else {
        startDownload('train', null, dsConfig);
      }
    }).catch(function() {
      startDownload('train', null, dsConfig);
    });
  }

  function showConfigSelectionPopup(cfgData, repoId, dsName, btnEl, startDownload) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var rowsHtml = cfgData.configs.map(function(c, i) {
      return '<label style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0.6rem;cursor:pointer;font-size:0.8rem;border-radius:6px;border:1px solid var(--border-color);margin-bottom:0.25rem;">'
        + '<input type="radio" name="dsconfig" value="' + escapeHtml(c.name) + '" ' + (i === 0 ? 'checked' : '') + '>'
        + '<span style="font-weight:600;">' + escapeHtml(c.label || c.name) + '</span>'
        + (c.description ? '<span style="font-size:0.7rem;color:var(--text-secondary);">' + escapeHtml(c.description) + '</span>' : '')
        + '</label>';
    }).join('');
    overlay.innerHTML = '<div style="background:var(--bg-panel);border:1px solid var(--border-color);border-radius:12px;width:100%;max-width:500px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:15px 20px;border-bottom:1px solid var(--border-color);">'
      + '<div><h3 style="margin:0;font-size:1rem;">选择数据集配置</h3><div style="font-size:0.72rem;color:var(--text-secondary);margin-top:0.15rem;">' + escapeHtml(repoId) + ' 包含多个配置</div></div>'
      + '<button class="popup-close-btn" style="background:transparent;border:none;color:var(--text-secondary);cursor:pointer;font-size:1.2rem;">✖</button></div>'
      + '<div style="padding:0.8rem 1rem;max-height:50vh;overflow-y:auto;">' + rowsHtml + '</div>'
      + '<div style="padding:0.8rem 1rem;border-top:1px solid var(--border-color);display:flex;gap:0.5rem;justify-content:flex-end;">'
      + '<button class="btn-secondary popup-close-btn" style="font-size:0.8rem;">取消</button>'
      + '<button class="btn-primary dsconfig-confirm-btn" style="font-size:0.8rem;">确认并继续</button></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.popup-close-btn').forEach(function(b) { b.addEventListener('click', function() { overlay.remove(); }); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.dsconfig-confirm-btn').addEventListener('click', function() {
      var selected = overlay.querySelector('input[name="dsconfig"]:checked');
      if (!selected) { showStatus('⚠️ 请选择一个配置', 'error'); return; }
      overlay.remove();
      btnEl.dataset.config = selected.value;
      btnEl.click();
    });
  }

  function showDatasetFilePopup(filesData, repoId, dsName, dsConfig, startDownload) {
    var bySplit = filesData.by_split || {};
    var splitNames = Object.keys(bySplit);
    var rowIdx = 0;
    var rowsHtml = '';
    splitNames.forEach(function(sp) {
      var files = bySplit[sp];
      rowsHtml += '<div style="font-weight:700;font-size:0.75rem;padding:0.35rem 0;color:var(--theme-color);border-bottom:1px solid var(--border-color);margin-bottom:0.2rem;">📂 ' + sp + ' (' + files.length + ' 个文件)</div>';
      files.forEach(function(f) {
        var fid = 'dsfile-' + rowIdx;
        rowsHtml += '<label style="display:flex;align-items:center;gap:0.4rem;padding:0.25rem 0.4rem;cursor:pointer;font-size:0.78rem;border-radius:4px;">'
          + '<input type="checkbox" class="dsfile-check" data-rfilename="' + escapeHtml(f.rfilename) + '" data-split="' + sp + '" checked>'
          + '<code style="flex:1;font-size:0.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(f.basename) + '</code>'
          + '<span style="font-size:0.65rem;color:var(--text-secondary);white-space:nowrap;">' + f.size_str + '</span></label>';
        rowIdx++;
      });
    });

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = '<div style="background:var(--bg-panel);border:1px solid var(--border-color);border-radius:12px;width:100%;max-width:650px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 10px 30px rgba(0,0,0,0.5);">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:15px 20px;border-bottom:1px solid var(--border-color);">'
      + '<div><h3 style="margin:0;font-size:1rem;">选择要下载的文件</h3><div style="font-size:0.72rem;color:var(--text-secondary);margin-top:0.15rem;">' + escapeHtml(repoId) + ' — 共 ' + filesData.total_files + ' 个数据文件</div></div>'
      + '<button class="popup-close-btn" style="background:transparent;border:none;color:var(--text-secondary);cursor:pointer;font-size:1.2rem;">✖</button></div>'
      + '<div style="padding:0.6rem 1rem;display:flex;gap:0.3rem;flex-wrap:wrap;border-bottom:1px solid var(--border-color);">'
      + splitNames.map(function(sp) { return '<button class="btn-secondary split-toggle-btn" data-split="' + sp + '" style="font-size:0.65rem;padding:0.1rem 0.4rem;">全选 ' + sp + '</button>'; }).join('')
      + '<button class="btn-secondary select-all-btn" style="font-size:0.65rem;padding:0.1rem 0.4rem;">全选</button>'
      + '<button class="btn-secondary deselect-all-btn" style="font-size:0.65rem;padding:0.1rem 0.4rem;">取消全选</button></div>'
      + '<div style="flex:1;overflow-y:auto;padding:0.8rem 1rem;">' + rowsHtml + '</div>'
      + '<div style="padding:0.8rem 1rem;border-top:1px solid var(--border-color);display:flex;gap:0.5rem;justify-content:flex-end;">'
      + '<button class="btn-secondary popup-close-btn" style="font-size:0.8rem;">取消</button>'
      + '<button class="btn-primary dsfile-dl-confirm-btn" style="font-size:0.8rem;">下载选中文件</button></div></div>';
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.popup-close-btn').forEach(function(b) { b.addEventListener('click', function() { overlay.remove(); }); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.select-all-btn').addEventListener('click', function() { overlay.querySelectorAll('.dsfile-check').forEach(function(cb) { cb.checked = true; }); });
    overlay.querySelector('.deselect-all-btn').addEventListener('click', function() { overlay.querySelectorAll('.dsfile-check').forEach(function(cb) { cb.checked = false; }); });
    overlay.querySelectorAll('.split-toggle-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var sp = btn.dataset.split;
        var allChecked = true;
        overlay.querySelectorAll('.dsfile-check').forEach(function(cb) { if (cb.dataset.split === sp && !cb.checked) allChecked = false; });
        overlay.querySelectorAll('.dsfile-check').forEach(function(cb) { if (cb.dataset.split === sp) cb.checked = !allChecked; });
      });
    });
    overlay.querySelector('.dsfile-dl-confirm-btn').addEventListener('click', function() {
      var checked = overlay.querySelectorAll('.dsfile-check:checked');
      if (checked.length === 0) { showStatus('⚠️ 请至少选择一个文件', 'error'); return; }
      overlay.remove();
      var total = checked.length, done = 0;
      checked.forEach(function(cb) {
        startDownload(cb.dataset.split, cb.dataset.rfilename, dsConfig);
        done++;
        if (done < total) showStatus('📥 [' + done + '/' + total + '] 已添加到下载队列', 'success');
      });
    });
  }

  window.loadDatasets = function () {
    if (!_trainingInited) return;
    apiFetch('/datasets').then(function(data) {
      _currentDatasets = data.datasets || [];
      var container = document.getElementById('dataset-list-container');
      if (!container) return;
      if (_currentDatasets.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>暂无数据集</p></div>';
      } else {
        container.innerHTML = _currentDatasets.map(function(ds) {
          return '<div class="dataset-item" data-id="' + ds.id + '" style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem;border:1px solid var(--border-color);border-radius:6px;margin-bottom:0.4rem;cursor:pointer;transition:border-color 0.15s;" title="点击预览数据集内容">'
            + '<div><strong>' + escapeHtml(ds.name) + '</strong><br>'
            + '<span style="font-size:0.72rem;color:var(--text-secondary);">' + (ds.sample_count || '?') + ' 条</span></div>'
            + '<button class="btn-secondary delete-dataset-btn" data-id="' + ds.id + '" style="font-size:0.7rem;padding:0.2rem 0.5rem;color:var(--error);" title="删除数据集">删除</button>'
            + '</div>';
        }).join('');
      }
      // Populate selects
      populateSelect('scratch-dataset', _currentDatasets, 'name', 'id');
      populateSelect('finetune-dataset', _currentDatasets, 'name', 'id');
      // Re-render recommended with updated download status
      apiFetch('/recommended-datasets').then(function(rd) { renderRecommendedDatasets(rd.datasets || []); }).catch(function() {});
    }).catch(function() {});
    apiFetch('/recommended-datasets').then(function(data) { renderRecommendedDatasets(data.datasets || []); }).catch(function() {
      var grid = document.getElementById('recommended-datasets-grid');
      if (grid) grid.innerHTML = '<div class="empty-state"><p>加载推荐数据集失败</p></div>';
    });
  };

  window.showDatasetPreview = function (dsId) {
    apiFetch('/datasets/' + dsId + '/preview?n=10').then(function(data) {
      var modal = document.getElementById('dataset-preview-modal');
      var desc = document.getElementById('dataset-preview-desc');
      var samples = document.getElementById('dataset-preview-samples');
      if (!modal || !samples) return;
      desc.textContent = data.name + ' — ' + (data.count || '?') + ' 条样本 (显示前 ' + Math.min(data.samples ? data.samples.length : 0, 10) + ' 条)';
      var html = '';
      (data.samples || []).forEach(function(s, i) {
        var json = typeof s === 'string' ? s : JSON.stringify(s, null, 2);
        html += '<div style="margin-bottom:0.6rem;padding:0.5rem;background:var(--bg-panel);border-radius:6px;border:1px solid var(--border-color);">'
          + '<div style="font-size:0.7rem;color:var(--text-secondary);margin-bottom:0.25rem;">#' + (i + 1) + '</div>'
          + '<pre style="margin:0;font-size:0.75rem;white-space:pre-wrap;word-break:break-all;color:var(--text-primary);">' + escapeHtml(json) + '</pre>'
          + '</div>';
      });
      if (!data.samples || data.samples.length === 0) {
        html = '<div class="empty-state"><p>暂无样本数据</p></div>';
      }
      samples.innerHTML = html;
      modal.style.display = 'flex';
    }).catch(function() { showStatus('加载数据集预览失败', 'error'); });
  };

  window.loadScratchTrainingData = function () {
    if (!_trainingInited) return;
    apiFetch('/model-configs').then(function(data) { populateSelect('scratch-model-config', data.configs || [], 'name', 'id'); }).catch(function() {});
    apiFetch('/datasets').then(function(data) { populateSelect('scratch-dataset', data.datasets, 'name', 'id'); }).catch(function() {});
  };

  window.loadBaseModels = function () {
    if (!_trainingInited) return;
    apiFetch('/base-models').then(function(data) { populateSelect('finetune-base-model', data.models || [], 'name', 'id'); }).catch(function() {});
  };

  // ── Training Runs ──

  window.loadTrainingRuns = function () {
    if (!_trainingInited) return;
    apiFetch('/runs').then(function(data) {
      var container = document.getElementById('training-runs-list');
      if (!container) return;
      var runs = data.runs || [];
      if (runs.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>暂无训练记录</p></div>';
        return;
      }
      var statusIcon = { running: '⏳', paused: '⏸️', completed: '✅', failed: '❌', aborted: '⏹', aborted_saved: '💾', pending: '📋' };
      var statusText = { running: '训练中', paused: '已暂停', completed: '已完成', failed: '失败', aborted: '已中止', aborted_saved: '中止并保存', pending: '等待中' };
      container.innerHTML = runs.map(function(r) {
        var icon = statusIcon[r.status] || '📋';
        var text = statusText[r.status] || r.status;
        return '<div class="config-item" data-id="' + r.id + '" style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem;border:1px solid var(--border-color);border-radius:6px;margin-bottom:0.4rem;cursor:pointer;">'
          + '<div style="flex:1;">'
          + '<div class="config-item-title" style="font-weight:600;font-size:0.85rem;">' + icon + ' ' + escapeHtml(r.name || ('Run #' + r.id)) + '</div>'
          + '<div class="config-item-meta" style="font-size:0.72rem;color:var(--text-secondary);margin-top:0.15rem;">'
          + '<span>' + (r.base_model_id || '从头训练') + '</span> · '
          + '<span style="font-weight:500;">' + text + '</span> · '
          + '<span>' + (r.current_epoch ? r.current_epoch.toFixed(1) : '0') + ' epoch</span> · '
          + '<span>' + (r.created_at || '') + '</span>'
          + (r.checkpoint_dir ? '<br><span style="opacity:0.8;font-size:0.7rem;">📍 ' + escapeHtml(r.checkpoint_dir) + '</span>' : '')
          + '</div></div>'
          + '<div style="display:flex;gap:0.3rem;align-items:center;">'
          + (r.status === 'completed' || r.status === 'aborted_saved'
            ? '<button class="btn-secondary test-run-btn" data-id="' + r.id + '" style="font-size:0.7rem;padding:0.2rem 0.4rem;color:var(--theme-color);">对话测试</button>'
            + '<button class="btn-secondary eval-ppl-btn" data-id="' + r.id + '" style="font-size:0.7rem;padding:0.2rem 0.4rem;color:#f59e0b;">PPL</button>'
            : '')
          + '<button class="btn-secondary delete-run-btn" data-id="' + r.id + '" style="font-size:0.7rem;padding:0.2rem 0.4rem;color:var(--error);">删除</button>'
          + '</div></div>'
          + '<div class="eval-progress-row" id="eval-progress-' + r.id + '" style="display:none;margin-top:0.3rem;margin-bottom:0.5rem;padding:0.3rem 0.5rem;background:var(--bg-card-hover);border-radius:4px;font-size:0.72rem;">'
          + '<div style="display:flex;justify-content:space-between;"><span class="eval-progress-label">PPL 评估中...</span><span class="eval-progress-pct">0%</span></div>'
          + '<div style="height:4px;background:var(--border-color);border-radius:2px;margin-top:0.2rem;"><div class="eval-progress-bar" style="width:0%;height:100%;background:#f59e0b;border-radius:2px;transition:width 0.3s;"></div></div>'
          + '</div>';
      }).join('');
    }).catch(function() {});
  };

  window.initTrainingMonitor = function () {
    if (!_trainingInited) return;
    // Reset loss chart data when entering monitor
    _lossData = [];
    _valLossData = [];
    drawLossChart();
    apiFetch('/runs').then(function(data) {
      var runs = data.runs || [];
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

  // ── Benchmark ──

  function loadBenchmarkDownloadCards() {
    var benchList = document.getElementById('benchmark-download-list');
    if (!benchList) return;
    var benchmarks = [
      { id: 'mmlu', name: 'MMLU', hf: 'cais/mmlu', size: '~100MB' },
      { id: 'hellaswag', name: 'HellaSwag', hf: 'Rowan/hellaswag', size: '~50MB' },
      { id: 'hle', name: 'HLE', hf: 'cais/hle', size: '~10MB' },
      { id: 'swe_bench', name: 'SWE-bench', hf: 'princeton-nlp/SWE-bench_Verified', size: '~200MB' },
    ];
    benchList.innerHTML = benchmarks.map(function(b) {
      return '<div class="bench-dataset-card" data-bench="' + b.id + '" style="border:1px solid var(--border-color);border-radius:8px;padding:0.75rem;display:flex;flex-direction:column;gap:0.3rem;background:var(--bg-card-hover);cursor:pointer;transition:border-color 0.15s;" title="点击预览已缓存的题目">'
        + '<div style="font-weight:600;font-size:0.82rem;">📦 ' + b.name + '</div>'
        + '<div style="font-size:0.7rem;color:var(--text-secondary);">' + b.hf + ' · ' + b.size + '</div>'
        + '<div style="display:flex;gap:0.3rem;margin-top:0.2rem;">'
        + '<button class="btn-secondary bench-dl-btn" data-bench="' + b.id + '" data-name="' + b.name + '" style="flex:1;font-size:0.72rem;">一键下载</button>'
        + '<a href="https://huggingface.co/datasets/' + b.hf + '" target="_blank" class="btn-secondary" style="font-size:0.72rem;text-decoration:none;display:flex;align-items:center;padding:0.2rem 0.5rem;">🔗</a>'
        + '</div></div>';
    }).join('');

    // Check cache status
    apiFetch('/benchmark/cache-status').then(function(data) {
      var caches = data.caches || {};
      benchList.querySelectorAll('.bench-dl-btn').forEach(function(btn) {
        var btype = btn.dataset.bench;
        if (caches[btype] && caches[btype].cached) {
          btn.textContent = '已下载 ✓ (' + caches[btype].count + ' 题)';
          btn.dataset.cached = 'true';
        }
      });
    }).catch(function() {});

    // Wire download
    benchList.querySelectorAll('.bench-dl-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var self = this;
        self.disabled = true;
        self.textContent = '下载中...';
        fetch(API_BASE + '/benchmark/pre-download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ benchmark_type: self.dataset.bench }) }).then(function(r) { return r.json(); }).then(function(d) {
          if (d.status === 'ok') {
            self.textContent = '已下载 ✓ (' + d.count + ' 题)';
            self.dataset.cached = 'true';
            showStatus('📥 ' + d.message, 'success');
          } else {
            showStatus('❌ ' + (d.detail || '失败'), 'error');
            self.disabled = false;
            self.textContent = '一键下载';
          }
        }).catch(function() {
          showStatus('❌ 网络错误', 'error');
          self.disabled = false;
          self.textContent = '一键下载';
        });
      });
    });
  }

  window.showBenchmarkDatasetPreview = function (benchType) {
    var modal = document.getElementById('dataset-preview-modal');
    var desc = document.getElementById('dataset-preview-desc');
    var samples = document.getElementById('dataset-preview-samples');
    if (!modal) return;
    desc.textContent = '加载中...';
    samples.innerHTML = '<div class="empty-state"><p>正在加载...</p></div>';
    modal.style.display = 'flex';

    // Try preview endpoint first, fall back to showing cache info
    apiFetch('/benchmark/preview/' + benchType + '?n=10').then(function(data) {
      desc.textContent = data.name + ' — ' + data.count + ' 题 (显示前 ' + Math.min(data.samples.length, 10) + ' 题)';
      var html = '';
      (data.samples || []).forEach(function(s, i) {
        var json = typeof s === 'string' ? s : JSON.stringify(s, null, 2);
        html += '<div style="margin-bottom:0.6rem;padding:0.5rem;background:var(--bg-panel);border-radius:6px;border:1px solid var(--border-color);">'
          + '<div style="font-size:0.7rem;color:var(--text-secondary);margin-bottom:0.25rem;">#' + (i + 1) + '</div>'
          + '<pre style="margin:0;font-size:0.75rem;white-space:pre-wrap;word-break:break-all;color:var(--text-primary);">' + escapeHtml(json) + '</pre>'
          + '</div>';
      });
      samples.innerHTML = html;
    }).catch(function(err) {
      desc.textContent = benchType + ' — 未缓存';
      samples.innerHTML = '<div class="empty-state"><p>数据集尚未缓存，请先点击"一键下载"下载题目</p></div>';
    });
  };

  function loadCheckpointStatus() {
    var container = document.getElementById('benchmark-resume-container');
    if (!container) return;
    apiFetch('/benchmark/checkpoint-status').then(function(data) {
      var ckpts = data.checkpoints || [];
      if (!ckpts.length) { container.innerHTML = ''; return; }
      container.innerHTML = ckpts.map(function(ck) {
        var progress = Object.entries(ck.progress || {}).map(function(e) { return e[0] + ': ' + e[1]; }).join(', ');
        return '<div class="card" style="border-color:var(--theme-color);margin-bottom:0.5rem;padding:0.6rem 0.8rem;">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.4rem;">'
          + '<div><span style="font-weight:600;">📋 ' + escapeHtml(ck.model_id) + '</span>'
          + '<span style="color:var(--text-secondary);margin-left:0.5rem;font-size:0.8rem;">' + progress + '</span></div>'
          + '<button class="btn-primary resume-bench-btn" data-model="' + escapeHtml(ck.model_id) + '" data-types="' + (ck.benchmark_types || []).join(',') + '" style="font-size:0.75rem;padding:0.3rem 0.8rem;">恢复测评</button>'
          + '</div></div>';
      }).join('');
      container.querySelectorAll('.resume-bench-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var sel = document.getElementById('bench-model-select');
          if (sel) sel.value = btn.dataset.model;
          document.querySelectorAll('#view-training-benchmark input[type=checkbox]').forEach(function(cb) {
            cb.checked = (btn.dataset.types || '').split(',').indexOf(cb.value) >= 0;
          });
          runBenchmark(true);
        });
      });
    }).catch(function() {});
  }

  function runBenchmark(resume) {
    if (_benchmarkRunning) return;
    var modelId = document.getElementById('bench-model-select')?.value;
    if (!modelId) { showStatus('⚠️ 请选择模型', 'error'); return; }
    var types = [];
    document.querySelectorAll('.finetune-module-check input[type="checkbox"]:checked').forEach(function(cb) { types.push(cb.value); });
    if (!types.length) { showStatus('⚠️ 请选择测评类型', 'error'); return; }
    _benchmarkRunning = true;
    var btn = document.getElementById('run-benchmark-btn');
    if (btn) { btn.disabled = true; btn.textContent = resume ? '恢复中...' : '测评中...'; }
    var progCard = document.getElementById('benchmark-progress-card');
    if (progCard) progCard.style.display = '';
    var progContainer = document.getElementById('benchmark-progress-container');
    if (progContainer) progContainer.innerHTML = '<div class="field-hint">' + (resume ? '正在恢复测评...' : '正在测评...') + '</div>';
    var resultsCard = document.getElementById('benchmark-results-card');
    if (resultsCard) resultsCard.style.display = 'none';
    var abortBtn = document.getElementById('benchmark-abort-btn');
    if (abortBtn) { abortBtn.style.display = ''; abortBtn.disabled = false; abortBtn.textContent = '中断测评'; }

    fetch(API_BASE + '/benchmark', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_id: modelId, model_source: 'online', benchmark_types: types, resume: !!resume })
    }).then(function(r) { return r.json(); }).then(function(data) {
      displayBenchmarkResults(data);
      if (resume) loadCheckpointStatus();
    }).catch(function() { showStatus('❌ 测评失败', 'error'); })
    .finally(function() {
      _benchmarkRunning = false;
      if (btn) { btn.disabled = false; btn.textContent = '开始测评'; }
    });
  }

  function displayBenchmarkResults(data) {
    var card = document.getElementById('benchmark-results-card');
    var content = document.getElementById('benchmark-results-content');
    if (!card || !content) return;
    card.style.display = '';
    var results = data.results || [];
    var html = '<div class="model-preview" style="margin-bottom:1rem;display:flex;gap:1rem;flex-wrap:wrap;padding:0.6rem;background:var(--bg-card-hover);border-radius:8px;">'
      + '<div class="preview-item"><label>模型</label><span>' + escapeHtml(data.model_id || '') + '</span></div>'
      + '<div class="preview-item"><label>平均延迟</label><span>' + (data.avg_latency_ms || 0).toFixed(0) + ' ms</span></div>'
      + '<div class="preview-item"><label>Token/秒</label><span>' + (data.tokens_per_second || 0).toFixed(1) + '</span></div>'
      + '<div class="preview-item"><label>总题数</label><span>' + (data.total_questions || 0) + '</span></div>'
      + '</div>';

    results.forEach(function(r, ri) {
      var accColor = r.accuracy >= 0.7 ? 'var(--success)' : r.accuracy >= 0.4 ? '#f59e0b' : 'var(--error)';
      html += '<div style="margin-bottom:1rem;border:1px solid var(--border-color);border-radius:8px;padding:0.8rem;">'
        + '<div style="font-weight:700;margin-bottom:0.5rem;font-size:0.9rem;">' + escapeHtml(r.name) + ' — 准确率: <span style="color:' + accColor + '">' + (r.accuracy * 100).toFixed(0) + '%</span> (' + r.correct + '/' + r.num_questions + ')</div>';
      if (r.subjects && Object.keys(r.subjects).length > 1) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.5rem;">';
        Object.entries(r.subjects).forEach(function(e) {
          var subj = e[0], s = e[1];
          var subjColor = s.accuracy >= 0.7 ? 'var(--success)' : s.accuracy >= 0.4 ? '#f59e0b' : 'var(--error)';
          html += '<span style="font-size:0.65rem;padding:0.15rem 0.4rem;background:var(--bg-inner);border:1px solid var(--border-color);border-radius:10px;" title="' + subj + ': ' + (s.accuracy * 100).toFixed(0) + '%">' + subj + ' <b style="color:' + subjColor + '">' + (s.accuracy * 100).toFixed(0) + '%</b></span>';
        });
        html += '</div>';
      }
      var details = r.details || [];
      if (details.length) {
        html += '<div style="display:flex;gap:2px;margin-bottom:0.4rem;height:4px;border-radius:2px;overflow:hidden;">';
        details.forEach(function(d) {
          var sc = d.score || 0;
          var scColor = sc >= 0.8 ? 'var(--success)' : sc >= 0.5 ? '#f59e0b' : sc > 0 ? 'var(--error)' : '#9ca3af';
          html += '<div style="flex:1;background:' + scColor + ';" title="#' + ((d.idx || 0) + 1) + ': ' + sc + '"></div>';
        });
        html += '</div>';
      }
      var batchId = 'bbr-' + ri + '-' + Date.now();
      html += '<div style="max-height:360px;overflow-y:auto;border:1px solid var(--border-color);border-radius:6px;">';
      details.forEach(function(d, di) {
        var qid = batchId + '-q' + di;
        var sc = d.score || 0;
        var scColor = sc >= 0.8 ? 'var(--success)' : sc >= 0.5 ? '#f59e0b' : 'var(--error)';
        var scLabel = d.error ? 'ERR' : sc.toFixed(1);
        var question = d.question || '';
        var qPreview = question.length > 80 ? question.substring(0, 80) + '...' : question;
        html += '<div style="border-bottom:1px solid var(--border-color);font-size:0.75rem;">'
          + '<div class="bench-q-header" data-qid="' + qid + '" style="display:flex;align-items:center;gap:0.4rem;padding:0.35rem 0.5rem;cursor:pointer;user-select:none;">'
          + '<span style="font-weight:600;min-width:28px;color:var(--text-secondary);">#' + ((d.idx || di) + 1) + '</span>'
          + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(qPreview) + '</span>'
          + '<span style="font-weight:700;min-width:32px;text-align:center;padding:0.1rem 0.3rem;border-radius:4px;font-size:0.7rem;background:' + scColor + '22;color:' + scColor + ';">' + scLabel + '</span>'
          + '<span style="color:var(--text-secondary);font-size:0.65rem;min-width:45px;text-align:right;">' + (d.latency_ms || 0) + 'ms</span>'
          + '<span style="font-size:0.65rem;color:var(--text-secondary);">▶</span></div>'
          + '<div id="' + qid + '" style="display:none;padding:0.4rem 0.6rem;background:var(--bg-inner);border-top:1px solid var(--border-color);">'
          + '<div style="margin-bottom:0.35rem;"><span style="font-weight:600;color:var(--text-secondary);">题目:</span><div style="white-space:pre-wrap;margin-top:0.15rem;">' + escapeHtml(question) + '</div></div>';
        if (d.choices && d.choices.length) {
          var labels = ['A', 'B', 'C', 'D', 'E', 'F'];
          html += '<div style="margin-bottom:0.35rem;"><span style="font-weight:600;color:var(--text-secondary);">选项:</span><div style="margin-top:0.15rem;">' + d.choices.map(function(c, i) { return '<span style="margin-right:0.6rem;">' + labels[i] + ') ' + escapeHtml(c) + '</span>'; }).join('') + '</div></div>';
        }
        if (d.error) {
          html += '<div style="margin-bottom:0.35rem;color:var(--error);"><span style="font-weight:600;">错误:</span> ' + escapeHtml(d.error) + '</div>';
        } else {
          html += '<div style="margin-bottom:0.35rem;"><span style="font-weight:600;color:var(--text-secondary);">模型回答:</span><div style="white-space:pre-wrap;margin-top:0.15rem;">' + escapeHtml(d.answer || '') + '</div></div>';
        }
        html += '<div style="margin-bottom:0.35rem;"><span style="font-weight:600;color:var(--text-secondary);">期望答案:</span> ' + escapeHtml(d.expected || '(无)') + '</div>'
          + '<div style="display:flex;gap:0.8rem;flex-wrap:wrap;font-size:0.7rem;color:var(--text-secondary);">'
          + '<span>得分: <b style="color:' + scColor + '">' + sc.toFixed(2) + '</b></span>'
          + '<span>评分方式: ' + escapeHtml(d.scoring || 'keyword_match') + '</span>'
          + '<span>延迟: ' + (d.latency_ms || 0) + 'ms</span>'
          + '<span>Token: ' + (d.tokens || 0) + '</span>'
          + '<span>科目: ' + escapeHtml(d.subject || 'general') + '</span></div>'
          + '</div></div>';
      });
      html += '</div></div>';
    });
    content.innerHTML = html;
    content.querySelectorAll('.bench-q-header').forEach(function(header) {
      header.addEventListener('click', function() {
        var body = document.getElementById(this.dataset.qid);
        if (!body) return;
        var arrow = this.querySelector('span:last-child');
        if (body.style.display === 'none') { body.style.display = ''; if (arrow) arrow.textContent = '▼'; }
        else { body.style.display = 'none'; if (arrow) arrow.textContent = '▶'; }
      });
    });
    card.scrollIntoView({ behavior: 'smooth' });
  }

  function loadBenchmarkHistory() {
    apiFetch('/benchmarks').then(function(data) {
      var hist = document.getElementById('benchmark-history-list');
      if (!hist) return;
      var benches = data.benchmarks || [];
      // Filter out non-benchmark entries (PPL has dict metrics_json, not array)
      benches = benches.filter(function(b) { return b.benchmark_type !== 'ppl'; });
      if (benches.length === 0) {
        hist.innerHTML = '<div class="empty-state"><p>暂无测评记录</p></div>';
        return;
      }
      hist.innerHTML = benches.map(function(b) {
        var raw = b.metrics_json;
        var metrics = [];
        try { metrics = typeof raw === 'string' ? JSON.parse(raw) : (raw || []); } catch(e) { metrics = []; }
        if (!Array.isArray(metrics)) metrics = [];
        var accStr = metrics.map(function(m) { return m.name + ': ' + (m.accuracy * 100).toFixed(0) + '%'; }).join(' ');
        return '<div class="download-item benchmark-history-item" data-id="' + b.id + '" style="cursor:pointer;display:flex;align-items:center;padding:0.5rem;border:1px solid var(--border-color);border-radius:6px;margin-bottom:0.3rem;">'
          + '<div style="font-size:1.2rem;margin-right:0.5rem;">📊</div>'
          + '<div style="flex:1;">'
          + '<div style="font-weight:500;font-size:0.82rem;">' + escapeHtml(b.model_id || '') + '</div>'
          + '<div style="font-size:0.7rem;color:var(--text-secondary);">' + accStr + ' · ' + (b.avg_latency_ms || '?') + 'ms · ' + (b.tokens_per_second || '?') + ' tok/s</div></div>'
          + '<button class="btn-secondary delete-benchmark-btn" data-id="' + b.id + '" style="font-size:0.65rem;padding:0.15rem 0.4rem;color:var(--error);">删除</button>'
          + '</div>';
      }).join('');
      // Click to view detail
      hist.querySelectorAll('.benchmark-history-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
          if (e.target.closest('.delete-benchmark-btn')) return;
          var id = this.dataset.id;
          fetch(API_BASE + '/benchmarks/' + id).then(function(r) { return r.json(); }).then(function(b) {
            var raw = b.metrics_json;
            var metrics = [];
            try { metrics = typeof raw === 'string' ? JSON.parse(raw) : (raw || []); } catch(e) { metrics = []; }
            if (!Array.isArray(metrics)) metrics = [];
            displayBenchmarkResults({
              model_id: b.model_id, results: metrics,
              avg_latency_ms: b.avg_latency_ms, tokens_per_second: b.tokens_per_second,
              total_questions: b.num_questions
            });
          }).catch(function() { showStatus('加载测评详情失败', 'error'); });
        });
      });
      // Delete handlers
      hist.querySelectorAll('.delete-benchmark-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (!confirm('确定删除此测评记录?')) return;
          fetch(API_BASE + '/benchmarks/' + btn.dataset.id, { method: 'DELETE' }).then(function() { loadBenchmarkHistory(); }).catch(function() {});
        });
      });
    }).catch(function() {});
  }

  function openTestModelModal(runId) {
    _currentTestRunId = runId;
    var modal = document.getElementById('test-model-modal');
    var history = document.getElementById('test-chat-history');
    var desc = document.getElementById('test-model-desc');
    if (!modal || !history) return;
    desc.textContent = '正在与运行 #' + runId + ' 的微调模型对话';
    history.innerHTML = '<div class="message system" style="text-align:center;color:var(--text-secondary);font-size:0.85rem;">模型已就绪。请输入测试文本。</div>';
    var input = document.getElementById('test-model-input');
    if (input) input.value = '';
    modal.style.display = 'flex';
  }

  function sendTestChat() {
    var input = document.getElementById('test-model-input');
    var history = document.getElementById('test-chat-history');
    var sendBtn = document.getElementById('test-model-send');
    var maxLen = parseInt(document.getElementById('test-max-len')?.value) || 200;
    var temp = parseFloat(document.getElementById('test-temp')?.value) || 0.7;
    var prompt = input ? input.value.trim() : '';
    if (!prompt || !_currentTestRunId) return;

    var userMsg = document.createElement('div');
    userMsg.style.cssText = 'align-self:flex-end;background:var(--theme-color);color:white;padding:0.6rem 0.8rem;border-radius:12px 12px 2px 12px;max-width:85%;font-size:0.9rem;';
    userMsg.textContent = prompt;
    history.appendChild(userMsg);
    if (input) input.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = '生成中...';
    history.scrollTop = history.scrollHeight;

    fetch(API_BASE + '/runs/' + _currentTestRunId + '/test-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt, max_length: maxLen, temperature: temp })
    }).then(function(r) { return r.json(); }).then(function(data) {
      var aiMsg = document.createElement('div');
      aiMsg.style.cssText = 'align-self:flex-start;background:var(--bg-panel);border:1px solid var(--border-color);padding:0.6rem 0.8rem;border-radius:12px 12px 2px 12px;max-width:85%;font-size:0.9rem;white-space:pre-wrap;';
      if (data.response) aiMsg.textContent = data.response;
      else { aiMsg.style.color = 'var(--error)'; aiMsg.textContent = '❌ 错误: ' + (data.detail || '生成失败'); }
      history.appendChild(aiMsg);
      history.scrollTop = history.scrollHeight;
    }).catch(function() {
      var errMsg = document.createElement('div');
      errMsg.style.cssText = 'align-self:flex-start;color:var(--error);font-size:0.8rem;';
      errMsg.textContent = '❌ 推理失败，请确保后台有足够显存/内存。';
      history.appendChild(errMsg);
    }).finally(function() {
      sendBtn.disabled = false;
      sendBtn.textContent = '发送生成';
    });
  }

  function pollPPLResult(runId, btn) {
    var attempts = 0;
    function poll() {
      attempts++;
      if (attempts > 120) { btn.disabled = false; btn.textContent = 'PPL'; showStatus('PPL 评估超时', 'error'); return; }
      setTimeout(function() {
        fetch(API_BASE + '/runs/' + runId + '/eval-ppl').then(function(r) {
          if (!r.ok) {
            // Server error — might be transient
            if (r.status >= 500) { btn.disabled = false; btn.textContent = 'PPL'; showStatus('PPL 评估失败', 'error'); return; }
            poll(); return;
          }
          return r.json();
        }).then(function(d) {
          if (!d) { poll(); return; }
          if (d.status === 'running' || d.status === 'idle') { poll(); return; }
          if (d.status === 'done') {
            var m = d.metrics_json;
            if (m && m.ppl !== undefined) {
              var pplColor = m.ppl < 20 ? 'var(--success)' : m.ppl < 60 ? '#f59e0b' : 'var(--error)';
              var pplLevel = m.ppl < 15 ? '优秀' : m.ppl < 30 ? '良好' : m.ppl < 60 ? '一般' : '较差';
              var row = document.getElementById('eval-progress-' + runId);
              if (row) {
                row.style.display = '';
                var label = row.querySelector('.eval-progress-label');
                var pctEl = row.querySelector('.eval-progress-pct');
                var bar = row.querySelector('.eval-progress-bar');
                if (label) label.innerHTML = 'PPL: <b style=\"color:' + pplColor + '\">' + m.ppl.toFixed(2) + '</b> (' + pplLevel + ')';
                if (pctEl) pctEl.textContent = '';
                if (bar) bar.style.width = '100%';
              }
              btn.disabled = false;
            } else { poll(); }
          } else { poll(); }
        }).catch(function() { poll(); });
      }, 2000);
    }
    poll();
  }

  window.loadBenchmarkView = function () {
    if (!_trainingInited) return;
    // Model select
    apiFetch('/all-models').then(function(data) {
      var models = data.models || [];
      var sel = document.getElementById('bench-model-select');
      if (sel) {
        var online = models.filter(function(m) { return m.source === 'online'; });
        var local = models.filter(function(m) { return m.source !== 'online'; });
        var html = online.map(function(m) { return '<option value="' + escapeHtml(m.id) + '">' + escapeHtml(m.name) + '</option>'; }).join('');
        if (local.length) {
          html += '<option disabled>── 本地模型 ──</option>';
          html += local.map(function(m) { return '<option value="' + escapeHtml(m.id) + '">' + escapeHtml(m.name) + '</option>'; }).join('');
        }
        sel.innerHTML = html || '<option value="">无可用模型</option>';
      }
    }).catch(function() {});

    loadBenchmarkDownloadCards();
    loadCheckpointStatus();
    loadBenchmarkHistory();
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
    // Progress bar for stage-based events (loading_data, preparing, initializing, etc.)
    var progressContainer = document.getElementById('monitor-progress-container');
    var progressBar = document.getElementById('monitor-progress-bar');
    var stageLabel = document.getElementById('monitor-stage-label');
    var stagePercent = document.getElementById('monitor-stage-percent');

    if (data.stage) {
      // Stage event: loading_data (tokenization), preparing, building_model, etc.
      if (progressContainer) progressContainer.style.display = '';
      if (stageLabel) stageLabel.textContent = data.label || data.stage;
      if (progressBar && data.progress != null) {
        var pct = Math.min(Math.round(data.progress * 100), 100);
        progressBar.style.width = pct + '%';
      }
      if (stagePercent && data.progress != null) {
        stagePercent.textContent = Math.round(data.progress * 100) + '%';
      }
    } else {
      // Training step event — update metrics
      var lossEl = document.getElementById('monitor-loss');
      if (lossEl) lossEl.textContent = data.loss != null ? data.loss.toFixed(4) : '--';
      var gradNormEl = document.getElementById('monitor-grad-norm');
      if (gradNormEl) gradNormEl.textContent = data.grad_norm != null ? data.grad_norm.toFixed(4) : '--';
      var lrEl = document.getElementById('monitor-lr');
      if (lrEl && data.learning_rate != null) lrEl.textContent = typeof data.learning_rate === 'number' ? data.learning_rate.toExponential(2) : data.learning_rate;
      var epochEl = document.getElementById('monitor-epoch');
      if (epochEl) epochEl.textContent = data.epoch != null ? data.epoch : '--';
      var stepEl = document.getElementById('monitor-step');
      if (stepEl) stepEl.textContent = data.step != null ? data.step : '--';
      var valLossEl = document.getElementById('monitor-val-loss');
      if (valLossEl) valLossEl.textContent = data.val_loss != null ? data.val_loss.toFixed(4) : '--';
      var valPplEl = document.getElementById('monitor-val-ppl');
      if (valPplEl) valPplEl.textContent = data.val_ppl != null ? data.val_ppl.toFixed(2) : '--';
      // Update progress bar with training progress
      if (progressBar && data.progress != null) {
        progressBar.style.width = Math.min(Math.round(data.progress * 100), 100) + '%';
      }
      if (stagePercent && data.progress != null) {
        stagePercent.textContent = Math.round(data.progress * 100) + '%';
      }
      if (stageLabel) stageLabel.textContent = '训练中: epoch ' + (data.epoch || '?') + '/' + (data.total_epochs || '?')
        + ' step ' + (data.step || '?') + '/' + (data.steps_per_epoch || '?');
    }
    // Update status badge and run name
    var badge = document.getElementById('monitor-status-badge');
    if (badge) {
      if (data.stage === 'loading_data') badge.textContent = 'loading';
      else if (data.stage === 'preparing') badge.textContent = 'preparing';
      else badge.textContent = data.status || 'running';
    }
    if (data.run_id) _activeRunId = data.run_id;
    var nameEl = document.getElementById('monitor-run-name');
    if (nameEl && data.run_id) nameEl.textContent = '当前运行: Run #' + data.run_id;
    // Toggle pause/resume buttons
    var isRunning = data.status === 'running' || data.stage === 'loading_data' || data.stage === 'preparing';
    var pauseBtn = document.getElementById('monitor-pause-btn');
    var resumeBtn = document.getElementById('monitor-resume-btn');
    if (pauseBtn) pauseBtn.style.display = isRunning ? '' : 'none';
    if (resumeBtn) resumeBtn.style.display = 'none';
    // Record loss data and redraw chart
    if (!data.stage && data.loss != null) {
      _lossData.push(data.loss);
      if (_lossData.length > 300) _lossData.shift();
      if (data.val_loss != null) {
        _valLossData.push(data.val_loss);
        if (_valLossData.length > 300) _valLossData.shift();
      }
      drawLossChart();
    }
  };

  window.handleTrainingStepPaused = function (data) {
    var badge = document.getElementById('monitor-status-badge');
    if (badge) badge.textContent = 'paused';
    var pauseBtn = document.getElementById('monitor-pause-btn');
    var resumeBtn = document.getElementById('monitor-resume-btn');
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (resumeBtn) resumeBtn.style.display = '';
    showStatus('训练已暂停', '');
  };

  window.handleTrainingComplete = function (data) {
    var badge = document.getElementById('monitor-status-badge');
    if (badge) badge.textContent = data.aborted ? 'aborted' : 'completed';
    // Fill progress bar, then hide after delay
    var progressContainer = document.getElementById('monitor-progress-container');
    var progressBar = document.getElementById('monitor-progress-bar');
    if (progressBar) progressBar.style.width = '100%';
    if (progressContainer) setTimeout(function() { progressContainer.style.display = 'none'; }, 3000);
    var pauseBtn = document.getElementById('monitor-pause-btn');
    var resumeBtn = document.getElementById('monitor-resume-btn');
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (resumeBtn) resumeBtn.style.display = 'none';
    showStatus(data.aborted ? '训练已中止' : '训练完成!', 'success');
    if (typeof window.loadTrainingRuns === 'function') window.loadTrainingRuns();
  };

  window.handleTrainingError = function (data) {
    var badge = document.getElementById('monitor-status-badge');
    if (badge) badge.textContent = 'error';
    var pauseBtn = document.getElementById('monitor-pause-btn');
    var resumeBtn = document.getElementById('monitor-resume-btn');
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (resumeBtn) resumeBtn.style.display = 'none';
    showStatus('训练出错: ' + (data.error || data.message || '未知错误'), 'error');
    if (typeof window.loadTrainingRuns === 'function') window.loadTrainingRuns();
  };

  // ── Loss Chart ──
  function drawLossChart() {
    var canvas = document.getElementById('loss-chart-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.offsetWidth;
    var H = canvas.offsetHeight;
    // Set actual pixel size to avoid blurry rendering
    var dpr = window.devicePixelRatio || 1;
    if (canvas.width !== W * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = '10px sans-serif';
    ctx.textBaseline = 'middle';

    var all = _lossData.concat(_valLossData);
    if (all.length < 2) {
      ctx.fillStyle = 'var(--text-secondary)';
      ctx.textAlign = 'center';
      ctx.fillText('等待数据...', W / 2, H / 2);
      return;
    }
    var maxVal = Math.max.apply(null, all) * 1.05;
    var minVal = Math.min.apply(null, all) * 0.95;
    var range = maxVal - minVal || 1;

    var margin = { top: 12, right: 20, bottom: 24, left: 48 };
    var pw = W - margin.left - margin.right;
    var ph = H - margin.top - margin.bottom;
    var x = function(i) { return margin.left + (i / Math.max(_lossData.length - 1, 1)) * pw; };
    var y = function(v) { return margin.top + (maxVal - v) / range * ph; };

    // Grid lines & Y labels
    ctx.strokeStyle = 'rgba(128,128,128,0.15)';
    ctx.fillStyle = 'var(--text-secondary)';
    ctx.textAlign = 'right';
    var gridLines = 5;
    for (var g = 0; g <= gridLines; g++) {
      var gv = minVal + (range * g / gridLines);
      var gy = y(gv);
      ctx.beginPath();
      ctx.moveTo(margin.left, gy);
      ctx.lineTo(W - margin.right, gy);
      ctx.stroke();
      ctx.fillText(gv.toFixed(Math.abs(gv) < 0.01 ? 6 : 4), margin.left - 6, gy);
    }

    // X axis label
    ctx.textAlign = 'center';
    ctx.fillStyle = 'var(--text-secondary)';
    ctx.fillText('Step', W / 2, H - 4);

    // Draw validation loss curve (dashed, orange)
    if (_valLossData.length > 1) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      var vRatio = Math.max((_lossData.length - 1), 1) / Math.max(_valLossData.length - 1, 1);
      for (var i = 0; i < _valLossData.length; i++) {
        var vx = margin.left + ((i * vRatio) / Math.max(_valLossData.length - 1, 1) * vRatio) * pw;
        // space validation points evenly if timestamps not available
        var vxi = margin.left + (i / Math.max(_valLossData.length - 1, 1)) * pw;
        var vy = y(_valLossData[i]);
        i === 0 ? ctx.moveTo(vxi, vy) : ctx.lineTo(vxi, vy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // Legend
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'left';
      ctx.fillText('Val Loss', margin.left, margin.top - 4);
    }

    // Draw training loss curve (solid, theme color)
    ctx.strokeStyle = 'var(--theme-color)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < _lossData.length; i++) {
      var xi = x(i);
      var yi = y(_lossData[i]);
      i === 0 ? ctx.moveTo(xi, yi) : ctx.lineTo(xi, yi);
    }
    ctx.stroke();

    // Legend
    ctx.fillStyle = 'var(--theme-color)';
    ctx.textAlign = _valLossData.length > 1 ? 'right' : 'left';
    var lx = _valLossData.length > 1 ? W - margin.right : margin.left;
    ctx.fillText('Loss', lx, margin.top - 4);
  }

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

  window.handleEvalProgress = function (data) {
    var row = document.getElementById('eval-progress-' + data.run_id);
    if (!row) return;
    row.style.display = '';
    var pct = Math.round(data.progress * 100);
    var label = row.querySelector('.eval-progress-label');
    var pctEl = row.querySelector('.eval-progress-pct');
    var bar = row.querySelector('.eval-progress-bar');
    if (label) label.textContent = data.label || 'PPL 评估中...';
    if (pctEl) pctEl.textContent = pct + '%';
    if (bar) bar.style.width = pct + '%';
  };

  // ── Model Structure & Layer Stats ──
  var _modelLayers = [];
  var _layerStatsMap = {};  // name → {grad_max, act_mean, ...}
  var _layerStatsEnabled = true;

  window.toggleLayerStats = function () {
    _layerStatsEnabled = !_layerStatsEnabled;
    if (_activeRunId) {
      fetch(API_BASE + '/runs/' + _activeRunId + '/layer-stats-toggle', { method: 'POST' }).catch(function () { });
    }
    // Reset colors when disabled
    if (!_layerStatsEnabled) {
      _layerStatsMap = {};
      refreshLayerColors();
    }
  };

  window.handleModelStructure = function (data) {
    _modelLayers = data.layers || [];
    _layerStatsMap = {};
    renderModelTree();
  };

  window.handleLayerStats = function (data) {
    var acts = data.activations || [];
    var grads = data.gradients || [];
    // Build lookup: pick the last entry per layer name (most recent batch)
    var lookup = {};
    for (var i = 0; i < acts.length; i++) {
      var a = acts[i];
      if (!lookup[a.name]) lookup[a.name] = {};
      lookup[a.name].act_mean = a.mean;
      lookup[a.name].act_std = a.std;
    }
    for (var j = 0; j < grads.length; j++) {
      var g = grads[j];
      if (!lookup[g.name]) lookup[g.name] = {};
      lookup[g.name].grad_mean = g.grad_mean;
      lookup[g.name].grad_std = g.grad_std;
      lookup[g.name].grad_max = g.grad_max;
    }
    _layerStatsMap = lookup;
    if (_layerStatsEnabled) refreshLayerColors();
    // Refresh detail panel if open
    var sel = _selectedLayerName;
    if (sel && lookup[sel]) showLayerDetail(sel, lookup[sel]);
  };

  var _selectedLayerName = null;

  function renderModelTree() {
    var container = document.getElementById('activation-stats-container');
    if (!container) return;
    if (!_modelLayers.length) {
      container.innerHTML = '<div class="empty-state"><p>等待训练开始...</p></div>';
      return;
    }
    // Group by depth: count '.' in name to determine hierarchy
    var maxGrad = 1;
    var names = Object.keys(_layerStatsMap);
    for (var k = 0; k < names.length; k++) {
      var s = _layerStatsMap[names[k]];
      if (s && s.grad_max > maxGrad) maxGrad = s.grad_max;
    }

    var html = '<div style="max-height:400px;overflow-y:auto;font-size:0.72rem;">';
    for (var i = 0; i < _modelLayers.length; i++) {
      var ly = _modelLayers[i];
      var depth = ly.name.split('.').length;
      var pad = (depth - 1) * 14;
      var pStr = ly.params > 1e6 ? (ly.params / 1e6).toFixed(1) + 'M'
        : ly.params > 1e3 ? (ly.params / 1e3).toFixed(1) + 'K'
        : ly.params > 0 ? ly.params : '';
      var stat = _layerStatsMap[ly.name];
      var bgColor = 'transparent';
      if (stat && stat.grad_max != null && _layerStatsEnabled) {
        var ratio = Math.min(stat.grad_max / Math.max(maxGrad, 1e-12), 1);
        bgColor = gradientColor(ratio);
      }
      html += '<div class="layer-row" data-layer="' + ly.name
        + '" style="display:flex;align-items:center;padding:3px 6px;padding-left:'
        + (pad + 6) + 'px;cursor:pointer;background:' + bgColor
        + ';border-radius:3px;margin:1px 0;transition:background 0.3s;font-family:monospace;"'
        + ' onclick="showLayerDetail(\'' + ly.name + '\')"'
        + ' title="' + ly.name + ' | ' + ly.type + (pStr ? ' | ' + pStr : '') + '">'
        + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'
        + ly.name.split('.').pop() + '</span>'
        + '<span style="color:var(--text-secondary);font-size:0.65rem;opacity:0.6;margin-left:0.4rem;">'
        + ly.type + '</span>'
        + (pStr ? '<span style="color:var(--theme-color);font-size:0.65rem;opacity:0.7;margin-left:0.4rem;">'
        + pStr + '</span>' : '')
        + '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
  }

  function refreshLayerColors() {
    var maxGrad = 1;
    var names = Object.keys(_layerStatsMap);
    for (var k = 0; k < names.length; k++) {
      var s = _layerStatsMap[names[k]];
      if (s && s.grad_max > maxGrad) maxGrad = s.grad_max;
    }
    var rows = document.querySelectorAll('.layer-row');
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var name = row.dataset.layer;
      var stat = _layerStatsMap[name];
      if (stat && stat.grad_max != null && _layerStatsEnabled) {
        var ratio = Math.min(stat.grad_max / Math.max(maxGrad, 1e-12), 1);
        row.style.background = gradientColor(ratio);
      } else {
        row.style.background = 'transparent';
      }
    }
  }

  function gradientColor(ratio) {
    // Blue (cold) → White → Red (hot)
    var r, g, b;
    if (ratio < 0.5) {
      var t = ratio * 2; // 0→1
      r = Math.round(30 + t * 225);   // 30→255
      g = Math.round(144 + t * 111);  // 144→255
      b = Math.round(255);            // 255→255
    } else {
      var t = (ratio - 0.5) * 2; // 0→1
      r = Math.round(255);            // 255→255
      g = Math.round(255 - t * 210);  // 255→45
      b = Math.round(255 - t * 255);  // 255→0
    }
    return 'rgba(' + r + ',' + g + ',' + b + ',0.35)';
  }

  window.showLayerDetail = showLayerDetail;
  function showLayerDetail(name, statOverride) {
    _selectedLayerName = name;
    var panel = document.getElementById('layer-detail-panel');
    var nameEl = document.getElementById('layer-detail-name');
    var grid = document.getElementById('layer-detail-grid');
    if (!panel || !nameEl || !grid) return;
    panel.style.display = '';
    nameEl.textContent = name;

    var stat = statOverride || _layerStatsMap[name] || {};
    var ly = _modelLayers.find(function (x) { return x.name === name; }) || {};
    var pStr = ly.params > 1e6 ? (ly.params / 1e6).toFixed(2) + 'M'
      : ly.params > 1e3 ? (ly.params / 1e3).toFixed(1) + 'K'
      : ly.params || '0';

    grid.innerHTML =
      '<div>类型:</div><div style="font-weight:600;">' + (ly.type || '?') + '</div>'
      + '<div>参数量:</div><div style="font-weight:600;">' + pStr + '</div>'
      + '<div>可训练:</div><div style="font-weight:600;">' + (ly.trainable ? '是' : '否') + '</div>'
      + '<div style="grid-column:1/-1;margin-top:0.25rem;border-top:1px solid var(--border-color);padding-top:0.25rem;"></div>'
      + '<div>激活均值:</div><div>' + (stat.act_mean != null ? stat.act_mean.toExponential(3) : '--') + '</div>'
      + '<div>激活标准差:</div><div>' + (stat.act_std != null ? stat.act_std.toExponential(3) : '--') + '</div>'
      + '<div>梯度均值:</div><div>' + (stat.grad_mean != null ? stat.grad_mean.toExponential(3) : '--') + '</div>'
      + '<div>梯度标准差:</div><div>' + (stat.grad_std != null ? stat.grad_std.toExponential(3) : '--') + '</div>'
      + '<div>梯度最大值:</div><div style="color:#e74c3c;font-weight:600;">'
      + (stat.grad_max != null ? stat.grad_max.toExponential(3) : '--') + '</div>'
      + '<div style="grid-column:1/-1;margin-top:0.3rem;height:6px;border-radius:3px;background:'
      + (stat.grad_max != null ? gradientColor(Math.min(stat.grad_max / 0.01, 1)) : '#eee')
      + ';"></div>';
  }

  window.handleBenchmarkProgress = function (data) {
    var progContainer = document.getElementById('benchmark-progress-container');
    if (!progContainer) return;
    document.getElementById('benchmark-progress-card').style.display = '';
    var abortBtn = document.getElementById('benchmark-abort-btn');
    if (abortBtn) abortBtn.style.display = '';

    if (data.stage === 'loaded') {
      progContainer.innerHTML += '<div style="padding:0.2rem 0;font-size:0.82rem;color:var(--text-secondary);">' + escapeHtml(data.label || '') + '</div>';
    } else {
      var pct = Math.round((data.progress || 0) * 100);
      var taskLabel = data.task && data.task !== 'system' ? data.task : '';
      progContainer.innerHTML = '<div style="margin-bottom:0.4rem;font-size:0.85rem;">'
        + (taskLabel ? '<span style="font-weight:600;">' + escapeHtml(taskLabel) + '</span> ' : '')
        + '<span style="color:var(--text-secondary);">' + escapeHtml(data.label || '') + '</span></div>'
        + '<div style="display:flex;align-items:center;gap:0.5rem;">'
        + '<div style="flex:1;height:6px;background:var(--border-color);border-radius:3px;overflow:hidden;">'
        + '<div style="width:' + pct + '%;height:100%;background:var(--theme-color);border-radius:3px;transition:width 0.3s;"></div></div>'
        + '<span style="font-size:0.75rem;color:var(--text-secondary);min-width:35px;text-align:right;">' + pct + '%</span></div>';
    }
  };

  window.handleBenchmarkComplete = function (data) {
    var progContainer = document.getElementById('benchmark-progress-container');
    var abortBtn = document.getElementById('benchmark-abort-btn');
    if (abortBtn) abortBtn.style.display = 'none';

    if (data.aborted) {
      if (progContainer) progContainer.innerHTML = '<div style="color:var(--error);">测评已中断（进度已保存，可恢复测评）</div>';
      showStatus('测评已中断', 'error');
      var btn = document.getElementById('run-benchmark-btn');
      if (btn) { btn.disabled = false; btn.textContent = '开始测评'; }
      _benchmarkRunning = false;
      if (typeof window.loadCheckpointStatus === 'function') window.loadCheckpointStatus();
      return;
    }

    if (progContainer) progContainer.innerHTML = '<div style="color:var(--success);font-size:0.9rem;font-weight:600;">✅ 测评完成</div>';
    document.getElementById('benchmark-progress-card').style.display = 'none';
    showStatus('测评完成', 'success');
    // Show results inline if data is present
    var results = data.results || [];
    if (results.length > 0 && typeof displayBenchmarkResults === 'function') {
      displayBenchmarkResults({
        model_id: data.model_id,
        results: results,
        avg_latency_ms: data.avg_latency_ms || 0,
        tokens_per_second: data.tokens_per_second || 0,
        total_questions: results.reduce(function(sum, r) { return sum + (r.num_questions || 0); }, 0)
      });
    }
    if (typeof window.loadBenchmarkHistory === 'function') window.loadBenchmarkHistory();
  };

  // =============================================
  // Event binding
  // =============================================
  function bindEvents() {
    document.addEventListener('click', function(e) {
      // --- Training Designer ---
      // AI Design
      if (e.target.id === 'ai-design-btn') {
        if (typeof window.openAIDesignModal === 'function') window.openAIDesignModal();
        else showStatus('AI设计功能不可用', 'error');
        return;
      }
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
            var p = data.total_params_formatted || (data.total_params ? (data.total_params / 1e6).toFixed(1) + 'M' : '?');
            var inferMem = data.memory_mb ? (data.memory_mb > 1024 ? (data.memory_mb / 1024).toFixed(1) + 'GB' : data.memory_mb + 'MB') : '?';
            var trainMem = data.training_memory_mb ? (data.training_memory_mb > 1024 ? (data.training_memory_mb / 1024).toFixed(1) + 'GB' : data.training_memory_mb + 'MB') : '?';
            var flops = data.flops_per_token ? (data.flops_per_token > 1e12 ? (data.flops_per_token / 1e12).toFixed(2) + 'T' : (data.flops_per_token / 1e9).toFixed(1) + 'G') + ' FLOPs/token' : '?';
            preview.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;padding:0.5rem;background:var(--bg-card-hover);border-radius:6px;">'
              + '<div>架构: <strong>' + (data.architecture || '?') + '</strong></div>'
              + '<div>层数: <strong>' + (data.num_layers || '?') + '</strong></div>'
              + '<div>参数量: <strong>' + p + '</strong></div>'
              + '<div>每层参数: <strong>' + (data.per_layer_params ? (data.per_layer_params / 1e6).toFixed(1) + 'M' : '?') + '</strong></div>'
              + '<div>推理内存: <strong>' + inferMem + '</strong></div>'
              + '<div>训练内存: <strong>' + trainMem + '</strong></div>'
              + '<div style="grid-column:1/-1">计算量: <strong>' + flops + '</strong></div>'
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

      // Preview dataset content
      if (e.target.classList.contains('dataset-item')) {
        window.showDatasetPreview(e.target.dataset.id);
        return;
      }

      // Dataset preview modal close
      if (e.target.closest('#dataset-preview-close') || e.target.id === 'dataset-preview-modal') {
        document.getElementById('dataset-preview-modal').style.display = 'none';
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
        var configName = (
          document.getElementById('scratch-model-config').selectedOptions[0]?.text ||
          ('Config #' + configId)
        ).split(' - ')[0];
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
            name: configName + ' 从头训练',
            model_config_id: parseInt(configId),
            dataset_id: parseInt(datasetId),
            base_model_id: '',
            base_model_source: 'scratch',
            training_params_json: JSON.stringify(params)
          })
        }).then(function(r) {
          if (!r.ok) { return r.json().then(function(e) { throw new Error(e.detail || '创建失败'); }); }
          return r.json();
        }).then(function(data) {
          showStatus('训练已创建', 'success');
          _activeRunId = data.run_id;
          var monBtn = document.querySelector('[data-view="training-monitor"]');
          if (monBtn) (window.switchView || Function)(monBtn.dataset.view);
        }).catch(function(e) { showStatus(e.message || '创建训练失败', 'error'); });
        return;
      }

      // --- Training Finetune ---
      if (e.target.id === 'start-training-btn') {
        var modelId = document.getElementById('finetune-base-model').value;
        var datasetId = document.getElementById('finetune-dataset').value;
        if (!modelId || !datasetId) { showStatus('请选择模型和数据集', 'error'); return; }
        var modelName = (
          document.getElementById('finetune-base-model').selectedOptions[0]?.text ||
          (modelId || 'Model')
        ).split(' - ')[0];
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
            name: modelName + ' 微调',
            model_config_id: null,
            dataset_id: parseInt(datasetId),
            base_model_id: modelId || '',
            base_model_source: 'gguf',
            training_params_json: JSON.stringify(params)
          })
        }).then(function(r) {
          if (!r.ok) { return r.json().then(function(e) { throw new Error(e.detail || '创建失败'); }); }
          return r.json();
        }).then(function(data) {
          showStatus('微调已开始', 'success');
          _activeRunId = data.run_id;
          var monBtn = document.querySelector('[data-view="training-monitor"]');
          if (monBtn) (window.switchView || Function)(monBtn.dataset.view);
        }).catch(function(e) { showStatus(e.message || '启动微调失败', 'error'); });
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
      if (e.target.closest('.bench-dataset-card') && !e.target.closest('.bench-dl-btn') && !e.target.closest('a')) {
        window.showBenchmarkDatasetPreview(e.target.closest('.bench-dataset-card').dataset.bench);
        return;
      }

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
        runBenchmark(false);
        return;
      }

      if (e.target.id === 'benchmark-abort-btn') {
        if (!confirm('确定中断当前测评? 进度将保存，可后续恢复。')) return;
        e.target.disabled = true;
        e.target.textContent = '正在中断...';
        fetch(API_BASE + '/benchmark/cancel', { method: 'POST' }).catch(function() {});
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

      // --- Training Run Actions ---
      if (e.target.classList.contains('test-run-btn')) {
        openTestModelModal(e.target.dataset.id);
        return;
      }

      if (e.target.classList.contains('eval-ppl-btn')) {
        var btn = e.target;
        var runId = btn.dataset.id;
        btn.disabled = true;
        btn.textContent = '...';
        fetch(API_BASE + '/runs/' + runId + '/eval-ppl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }).then(function(r) { return r.json(); }).then(function(d) {
          if (d.status === 'started') {
            btn.textContent = 'PPL';
            // Show inline progress bar
            var row = document.getElementById('eval-progress-' + runId);
            if (row) { row.style.display = ''; row.querySelector('.eval-progress-bar').style.width = '0%'; }
            pollPPLResult(runId, btn);
          } else {
            btn.disabled = false;
            btn.textContent = 'PPL';
          }
        }).catch(function() { btn.disabled = false; btn.textContent = 'PPL'; });
        return;
      }

      if (e.target.classList.contains('delete-run-btn')) {
        if (!confirm('确定删除此训练记录?')) return;
        fetch(API_BASE + '/runs/' + e.target.dataset.id, { method: 'DELETE' }).then(function() {
          showStatus('已删除', 'success');
          window.loadTrainingRuns?.();
        }).catch(function() { showStatus('删除失败', 'error'); });
        return;
      }

      // --- Test Model Modal ---
      if (e.target.closest('#test-model-send')) {
        sendTestChat();
        return;
      }

      if (e.target.closest('#test-model-close') || e.target.id === 'test-model-modal') {
        document.getElementById('test-model-modal').style.display = 'none';
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

  // Register WebSocket message types so main app doesn't switch to chat
  var msgTypes = ['training_progress', 'training_complete', 'training_error',
    'training_step_paused', 'benchmark_progress', 'benchmark_complete',
    'install_progress', 'model_structure', 'layer_stats', 'eval_progress'];
  msgTypes.forEach(function(t) {
    if (window.registerWsMessageType) window.registerWsMessageType(t);
  });

  // Listen for WebSocket messages from the main app connection
  if (window.addWsListener) {
    var _firstProgressToast = true;
    window.addWsListener(function(data) {
      var type = data.type;
      // Debug: show one-time toast on first training/benchmark message to confirm WS path
      if (_firstProgressToast && (type === 'training_progress' || type === 'training_complete'
          || type === 'training_error' || type === 'training_step_paused'
          || type === 'benchmark_progress' || type === 'benchmark_complete')) {
        showStatus('WS: ' + type, '');
        _firstProgressToast = false;
      }
      if (type === 'training_progress') { window.handleTrainingProgress(data); }
      else if (type === 'training_complete') { window.handleTrainingComplete(data); }
      else if (type === 'training_error') { window.handleTrainingError(data); }
      else if (type === 'training_step_paused') { window.handleTrainingStepPaused(data); }
      else if (type === 'model_structure') { window.handleModelStructure(data); }
      else if (type === 'layer_stats') { window.handleLayerStats(data); }
      else if (type === 'benchmark_progress') { window.handleBenchmarkProgress(data); }
      else if (type === 'benchmark_complete' || type === 'benchmark_error') {
        if (type === 'benchmark_error') showStatus('测评出错', 'error');
        window.handleBenchmarkComplete(data);
      }
      else if (type === 'install_progress') { window.handleInstallProgress(data); }
      else if (type === 'eval_progress') { window.handleEvalProgress(data); }
    });
  }

  _trainingInited = true;
})();
