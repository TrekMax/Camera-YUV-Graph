import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';

const app = document.querySelector('#app');

app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#top" aria-label="回到顶部">
      <span class="brand-mark">Y</span>
      <span>看懂一帧图像</span>
    </a>
    <nav class="nav" aria-label="章节导航">
      <a href="#glossary">名词</a>
      <a href="#channels">通道</a>
      <a href="#sampling">采样</a>
      <a href="#layouts">布局</a>
      <a href="#convert">转换</a>
      <a href="#checklist">检查单</a>
    </nav>
    <div class="progress-wrap" aria-label="阅读进度"><span id="reading-progress"></span></div>
  </header>

  <main id="top">
    <section class="hero section-shell">
      <div class="hero-copy reveal">
        <div class="eyebrow"><span></span> CAMERA PIXEL PIPELINE · 01</div>
        <h1>一帧 YUV，<br><em>究竟怎么排？</em></h1>
        <p class="hero-lead">从 Sensor 交出一帧图像开始，拆开亮度与色度、采样率与字节布局，最后把每个像素准确写成 RGB888 或 RGB565。</p>
        <div class="hero-actions">
          <a class="primary-btn" href="#channels">开始拆帧 <span>↓</span></a>
          <button class="text-btn" id="toggle-motion" type="button"><span class="play-dot">Ⅱ</span> 暂停动画</button>
        </div>
        <div class="hero-note">
          <span>先记一句</span>
          <p>4:2:0 说的是“色度采多少”，Planar / Semi-planar / Packed 说的是“字节怎么排”。这是两条不同的轴。</p>
        </div>
      </div>
      <div class="hero-visual reveal">
        <div class="canvas-shell hero-canvas-shell">
          <canvas id="hero-canvas" aria-label="Y、U、V 像素平面三维分层模型"></canvas>
          <span class="plane-label y-label">Y · LUMA</span>
          <span class="plane-label u-label">U · Cb</span>
          <span class="plane-label v-label">V · Cr</span>
          <div class="drag-hint">拖拽观察 <span>↗</span></div>
        </div>
        <div class="equation-float">
          <span class="eq-label">完整链路</span>
          <div>Sensor → ISP → YUV → <b>RGB</b></div>
        </div>
      </div>
      <div class="chapter-index">01 <span>/ 05</span></div>
    </section>

    <section class="concept-strip" aria-label="图像数据链路">
      <div><span>01</span><p><b>Sensor / ISP</b><br>得到亮度与颜色</p></div><i>→</i>
      <div><span>02</span><p><b>Chroma sampling</b><br>决定色度分辨率</p></div><i>→</i>
      <div><span>03</span><p><b>Memory layout</b><br>决定字节地址</p></div><i>→</i>
      <div><span>04</span><p><b>Matrix + pack</b><br>还原并压入 RGB</p></div>
    </section>

    <section class="glossary section-shell" id="glossary">
      <div class="glossary-heading reveal">
        <div class="eyebrow"><span></span> BEFORE WE START · GLOSSARY</div>
        <h2>先读懂四个词，<br><em>再去看 bytes。</em></h2>
        <p>Chroma 描述“存什么颜色信息”；Planar、Semi-planar 与 Packed 描述“这些信息在内存里怎么排”。</p>
      </div>

      <div class="term-grid reveal">
        <article class="term-card chroma-card">
          <div class="term-top"><span>00 · SIGNAL</span><b>颜色信息</b></div>
          <h3>Chroma <small>/ˈkroʊmə/ · 色度</small></h3>
          <p>在数字 YUV 中，Chroma 通常指 <strong>U/Cb 与 V/Cr 两路色差信号</strong>。它们告诉系统颜色相对亮度偏蓝多少、偏红多少，而明暗细节主要由 Y 保存。</p>
          <div class="chroma-equation">
            <div><i class="term-y">Y</i><span>亮度 / 细节</span></div>
            <b>+</b>
            <div><i class="term-u">Cb</i><span>蓝色色差</span></div>
            <b>+</b>
            <div><i class="term-v">Cr</i><span>红色色差</span></div>
          </div>
          <div class="term-note"><b>为什么能少采？</b><span>人眼对 Chroma 的空间细节不如对亮度敏感，所以 4:2:2、4:2:0 会让多个 Y 共享色度样本。8-bit 数据中，U/V≈128 通常表示中性色差。</span></div>
        </article>

        <article class="term-card">
          <div class="term-top"><span>01 · LAYOUT</span><b>3 PLANES</b></div>
          <h3>Planar <small>平面式</small></h3>
          <p>Y、U、V 各占一块独立且连续的内存区域。处理某个通道很直接，但必须分别维护 plane 地址与 stride。</p>
          <div class="mini-memory planar-memory" aria-label="Planar 内存示意">
            <div><i>Y</i><i>Y</i><i>Y</i><i>Y</i></div>
            <div><i>U</i><i>U</i></div>
            <div><i>V</i><i>V</i></div>
          </div>
          <span class="term-example">I420: Y → U → V　·　YV12: Y → V → U</span>
        </article>

        <article class="term-card">
          <div class="term-top"><span>02 · LAYOUT</span><b>2 PLANES</b></div>
          <h3>Semi-planar <small>半平面式</small></h3>
          <p>Y 保持独立；U 与 V 合并到第二个 plane，并按样本交错。<strong>“Semi” 指组织方式，不表示分辨率减半。</strong></p>
          <div class="mini-memory semi-memory" aria-label="Semi-planar 内存示意">
            <div><i>Y</i><i>Y</i><i>Y</i><i>Y</i></div>
            <div><i>U</i><i>V</i><i>U</i><i>V</i></div>
          </div>
          <span class="term-example">NV12: UV UV…　·　NV21: VU VU…</span>
        </article>

        <article class="term-card">
          <div class="term-top"><span>03 · LAYOUT</span><b>1 PLANE</b></div>
          <h3>Packed <small>打包式</small></h3>
          <p>Y、U、V 全部混排在同一条 byte stream 中，通常按两个像素为一组读取。不能把某一路当作连续数组。</p>
          <div class="mini-memory packed-memory" aria-label="Packed 内存示意">
            <div><i>Y0</i><i>U0</i><i>Y1</i><i>V0</i><i>Y2</i><i>U1</i><i>Y3</i><i>V1</i></div>
          </div>
          <span class="term-example">YUYV: Y0 U0 Y1 V0　·　UYVY: U0 Y0 V0 Y1</span>
        </article>
      </div>

      <div class="glossary-rule reveal">
        <span>不要混淆</span>
        <p><b>4:2:0 / 4:2:2</b> 决定 Chroma 采样数量；<b>Planar / Semi-planar / Packed</b> 决定样本的内存排列。</p>
      </div>
    </section>

    <section class="lesson section-shell" id="channels">
      <div class="section-heading reveal">
        <div class="eyebrow"><span></span> CHAPTER 01 · SIGNAL</div>
        <div class="heading-row">
          <h2>先把颜色，<br><em>拆成亮度与色度</em></h2>
          <p>Y 近似描述明暗细节；U/Cb 与 V/Cr 描述蓝色差和红色差。人眼对亮度更敏感，所以色度可以少存一些——YUV 的节省从这里开始。</p>
        </div>
      </div>

      <div class="channel-lab reveal">
        <div class="channel-main">
          <div class="canvas-title"><span>INPUT</span><b>移动指针读取像素</b></div>
          <canvas id="source-pattern" aria-label="交互彩色测试图"></canvas>
          <div class="sample-marker" id="sample-marker" aria-hidden="true"></div>
        </div>
        <div class="channel-planes">
          <article><div class="plane-head"><span class="channel-dot dot-y"></span><b>Y</b><small>LUMA · 细节</small></div><canvas id="plane-y"></canvas></article>
          <article><div class="plane-head"><span class="channel-dot dot-u"></span><b>U</b><small>CB · 蓝色差</small></div><canvas id="plane-u"></canvas></article>
          <article><div class="plane-head"><span class="channel-dot dot-v"></span><b>V</b><small>CR · 红色差</small></div><canvas id="plane-v"></canvas></article>
        </div>
        <aside class="pixel-readout">
          <span class="step-tag">当前像素</span>
          <div class="sample-color" id="sample-color"></div>
          <div class="readout-row"><span>Y</span><b id="sample-y">128</b></div>
          <div class="readout-row"><span>U / Cb</span><b id="sample-u">128</b></div>
          <div class="readout-row"><span>V / Cr</span><b id="sample-v">128</b></div>
          <p>U/V 的 128 表示“没有色差”，不是黑色。</p>
        </aside>
      </div>

      <div class="formula-walkthrough reveal">
        <div class="formula-step"><span>①</span><div class="big-math">R · G · B</div><p>三路都同时携带<br>亮度与颜色信息</p></div>
        <div class="formula-arrow">→</div>
        <div class="formula-step"><span>②</span><div class="big-math">Y + Cb + Cr</div><p>把高频明暗细节<br>集中交给 Y</p></div>
        <div class="formula-arrow">→</div>
        <div class="formula-step accent-step"><span>③</span><div class="big-math">少采 U / V</div><p>降低带宽<br>仍保留主要视觉细节</p></div>
      </div>
    </section>

    <section class="dark-section" id="sampling">
      <div class="section-shell">
        <div class="section-heading light reveal">
          <div class="eyebrow"><span></span> CHAPTER 02 · SAMPLING</div>
          <div class="heading-row">
            <h2>4:2:0 不是格式名，<br><em>而是一种采样关系</em></h2>
            <p>采样比例只回答：一组亮度像素要共享多少个色度样本。它并不说明 U、V 在内存里是分开、交错还是与 Y 混排。</p>
          </div>
        </div>

        <div class="sampling-grid">
          <div class="sampling-copy reveal">
            <div class="sample-switch" role="group" aria-label="色度采样方式">
              <button data-sampling="444" type="button">4:4:4</button>
              <button data-sampling="422" type="button">4:2:2</button>
              <button class="active" data-sampling="420" type="button">4:2:0</button>
            </div>
            <div class="sampling-stat"><span id="sampling-ratio">50%</span><small>相对 RGB888 的典型数据量<br>8-bit 4:2:0 = 12 bpp</small></div>
            <h3 id="sampling-title">每 2×2 个 Y，共享 1 组 U/V</h3>
            <p id="sampling-copy">水平和垂直方向的色度分辨率都减半。4 个像素需要 4 个 Y、1 个 U、1 个 V，共 6 bytes。</p>
            <div class="legend"><span><i class="legend-y"></i>Y 每像素</span><span><i class="legend-u"></i>U / Cb</span><span><i class="legend-v"></i>V / Cr</span></div>
          </div>
          <div class="sampling-card reveal">
            <canvas id="sampling-canvas" aria-label="色度采样共享范围三维模型"></canvas>
            <div class="sampling-layer-labels"><span>Y × <b id="count-y">16</b></span><span>U × <b id="count-u">4</b></span><span>V × <b id="count-v">4</b></span></div>
            <div class="drag-hint dark-hint">拖拽观察 <span>↗</span></div>
          </div>
        </div>

        <div class="sampling-cards reveal">
          <article><span>4:4:4</span><b>每像素独立色度</b><p>Y:U:V = 1:1:1 · 24 bpp</p></article>
          <article><span>4:2:2</span><b>横向两像素共享</b><p>Y:U:V = 2:1:1 · 16 bpp</p></article>
          <article class="selected"><span>4:2:0</span><b>2×2 四像素共享</b><p>Y:U:V = 4:1:1 · 12 bpp</p></article>
        </div>
      </div>
    </section>

    <section class="lesson layout-section section-shell" id="layouts">
      <div class="section-heading reveal">
        <div class="eyebrow"><span></span> CHAPTER 03 · MEMORY</div>
        <div class="heading-row">
          <h2>知识图谱：<br><em>采样方式 × 内存布局</em></h2>
          <p>同样是 YUV，格式名决定你该从哪个地址取 Y、U、V。先判断采样率，再判断三类布局，最后确认 U/V 顺序。</p>
        </div>
      </div>

      <div class="knowledge-map reveal" aria-label="YUV 格式知识图谱">
        <div class="map-root"><span>ROOT</span><b>YUV FRAME</b><small>两个独立问题</small></div>
        <div class="map-trunk" aria-hidden="true"></div>
        <div class="map-axis sampling-axis">
          <div class="map-axis-title"><span>AXIS A</span><b>采多少 Chroma?</b></div>
          <div class="map-nodes"><span>4:4:4</span><span>4:2:2</span><span class="hot">4:2:0</span></div>
        </div>
        <div class="map-axis layout-axis">
          <div class="map-axis-title"><span>AXIS B</span><b>Bytes 怎么排列?</b></div>
          <div class="layout-branches">
            <div><b>Planar</b><span>I420 · YV12</span></div>
            <div><b>Semi-planar</b><span>NV12 · NV21</span></div>
            <div><b>Packed</b><span>YUYV · UYVY</span></div>
          </div>
        </div>
      </div>

      <div class="memory-atlas reveal">
        <div class="format-tabs" role="tablist" aria-label="选择 YUV 格式">
          <button class="active" data-format="I420" role="tab" type="button">I420</button>
          <button data-format="YV12" role="tab" type="button">YV12</button>
          <button data-format="NV12" role="tab" type="button">NV12</button>
          <button data-format="NV21" role="tab" type="button">NV21</button>
          <button data-format="YUYV" role="tab" type="button">YUYV</button>
          <button data-format="UYVY" role="tab" type="button">UYVY</button>
        </div>
        <div class="memory-body">
          <div class="memory-visual">
            <div class="memory-topline"><span>示例帧 · 4×2 pixels</span><b id="format-total">12 bytes</b></div>
            <div id="memory-rows"></div>
            <div class="address-line"><span>低地址</span><i></i><span>高地址</span></div>
          </div>
          <aside class="format-info">
            <span class="format-class" id="format-class">PLANAR · 4:2:0</span>
            <h3 id="format-name">I420 / YU12</h3>
            <p id="format-desc">先存完整 Y 平面，再存 U 平面，最后存 V 平面。三个 plane 完全分离。</p>
            <dl>
              <div><dt>内存顺序</dt><dd id="format-order">Y → U → V</dd></div>
              <div><dt>平均位宽</dt><dd id="format-bpp">12 bpp</dd></div>
              <div><dt>关键辨认</dt><dd id="format-key">U plane 在 V plane 前</dd></div>
            </dl>
          </aside>
        </div>
        <div class="memory-legend"><span><i class="cell-y"></i>Y / Luma</span><span><i class="cell-u"></i>U / Cb</span><span><i class="cell-v"></i>V / Cr</span></div>
      </div>

      <div class="layout-summary reveal">
        <article><span>01</span><h3>Planar</h3><p>Y、U、V 各自连续。I420 与 YV12 只差 U/V plane 顺序。</p></article>
        <article><span>02</span><h3>Semi-planar</h3><p>Y 独立，UV 两两交错。NV12 是 UV，NV21 是 VU。</p></article>
        <article><span>03</span><h3>Packed</h3><p>Y 与 UV 按像素组混排。YUYV / UYVY 常见于 4:2:2。</p></article>
      </div>
    </section>

    <section class="dark-section conversion-section" id="convert">
      <div class="section-shell">
        <div class="section-heading light reveal">
          <div class="eyebrow"><span></span> CHAPTER 04 · CONVERSION</div>
          <div class="heading-row">
            <h2>先还原 RGB，<br><em>再决定怎么打包</em></h2>
            <p>矩阵负责把 YUV 变成 R/G/B；输出格式负责分配位宽。BT.601 / BT.709 与 Full / Limited 必须和源数据匹配。</p>
          </div>
        </div>

        <div class="conversion-lab reveal">
          <div class="conversion-controls">
            <div class="lab-top"><span>LIVE CONVERTER</span><b>8-bit YUV → RGB</b></div>
            <div class="control-switches">
              <label>色彩矩阵<select id="matrix-select"><option value="601">BT.601 · SD</option><option value="709">BT.709 · HD</option></select></label>
              <label>量化范围<select id="range-select"><option value="limited">Limited · 16–235</option><option value="full">Full · 0–255</option></select></label>
            </div>
            <label class="range-label" for="y-slider"><span><i class="dot-y"></i>Y · Luma</span><output id="y-output">126</output></label>
            <input class="range y-range" id="y-slider" type="range" min="0" max="255" value="126" />
            <label class="range-label" for="u-slider"><span><i class="dot-u"></i>U · Cb</span><output id="u-output">86</output></label>
            <input class="range u-range" id="u-slider" type="range" min="0" max="255" value="86" />
            <label class="range-label" for="v-slider"><span><i class="dot-v"></i>V · Cr</span><output id="v-output">190</output></label>
            <input class="range v-range" id="v-slider" type="range" min="0" max="255" value="190" />
            <div class="matrix-note"><b id="matrix-note-title">BT.601 Limited</b><code id="matrix-formula">C=Y−16 · D=U−128 · E=V−128</code><p>先处理偏移，再做矩阵乘法，结果务必 clamp 到 0…255。</p></div>
          </div>
          <div class="conversion-output">
            <div class="color-preview" id="color-preview"><span id="preview-hex">#D15726</span></div>
            <div class="rgb-numbers">
              <div><span>R</span><b id="r-value">209</b><i id="r-bar"></i></div>
              <div><span>G</span><b id="g-value">87</b><i id="g-bar"></i></div>
              <div><span>B</span><b id="b-value">38</b><i id="b-bar"></i></div>
            </div>
            <div class="output-compare">
              <article>
                <span>RGB888 · 24 BITS</span>
                <div class="bit-row rgb888-bits"><i>R7…R0</i><i>G7…G0</i><i>B7…B0</i></div>
                <b id="rgb888-value">D1 57 26</b>
                <small>3 bytes / pixel · 每通道 8 bit</small>
              </article>
              <article>
                <span>RGB565 · 16 BITS</span>
                <div class="bit-row rgb565-bits"><i>R4…R0</i><i>G5…G0</i><i>B4…B0</i></div>
                <b id="rgb565-value">0xD2A4</b>
                <small id="rgb565-bytes">Little-endian bytes: A4 D2</small>
              </article>
            </div>
          </div>
        </div>

        <div class="equation-path reveal">
          <div><span>01</span><b>取样</b><p>按格式地址取得 Y、U、V</p></div><i>→</i>
          <div><span>02</span><b>上采样</b><p>为每个 Y 找到对应色度</p></div><i>→</i>
          <div><span>03</span><b>矩阵</b><p>按 range 与 standard 还原</p></div><i>→</i>
          <div><span>04</span><b>量化</b><p>RGB888 或截位为 RGB565</p></div>
        </div>

        <div class="code-lab reveal">
          <div class="code-side">
            <div class="code-top"><span>yuv_to_rgb.c</span><button id="copy-code" type="button">复制核心代码</button></div>
            <pre><code><span class="comment">// BT.601 limited-range，单像素转换</span>
<span class="kw">int</span> c = y - <span class="num">16</span>;
<span class="kw">int</span> d = u - <span class="num">128</span>;
<span class="kw">int</span> e = v - <span class="num">128</span>;

r = <span class="fn">clip8</span>((<span class="num">298</span>*c + <span class="num">409</span>*e + <span class="num">128</span>) >> <span class="num">8</span>);
g = <span class="fn">clip8</span>((<span class="num">298</span>*c - <span class="num">100</span>*d - <span class="num">208</span>*e + <span class="num">128</span>) >> <span class="num">8</span>);
b = <span class="fn">clip8</span>((<span class="num">298</span>*c + <span class="num">516</span>*d + <span class="num">128</span>) >> <span class="num">8</span>);

<span class="comment">// RGB565：RRRRR GGGGGG BBBBB</span>
rgb565 = ((r >> <span class="num">3</span>) << <span class="num">11</span>) |
         ((g >> <span class="num">2</span>) << <span class="num">5</span>)  |
          (b >> <span class="num">3</span>);</code></pre>
          </div>
          <aside class="code-notes">
            <span class="step-tag">实现提醒</span>
            <h3>矩阵没错，画面仍可能错</h3>
            <ul><li>CPU 字节序会改变 RGB565 两个 byte 的观察顺序。</li><li>RGB565 与 BGR565 的红蓝位段相反。</li><li>截位最快；四舍五入或 dithering 能减轻色带。</li></ul>
          </aside>
        </div>
      </div>
    </section>

    <section class="lesson section-shell" id="checklist">
      <div class="section-heading reveal">
        <div class="eyebrow"><span></span> CHAPTER 05 · DEBUG</div>
        <div class="heading-row">
          <h2>最后一公里：<br><em>先查描述，再查算法</em></h2>
          <p>摄像头“花屏、偏色、错行”多数不是矩阵公式本身，而是你对 buffer 的解释与驱动给出的元数据不一致。</p>
        </div>
      </div>

      <div class="check-grid reveal">
        <article><span>01 · ADDRESS</span><h3>Stride / Row pitch</h3><p>一行占用的 bytes 可能大于 width。下一行地址应加 stride，不是图像宽度。</p><b>症状：斜切、逐行错位</b></article>
        <article><span>02 · PLANE</span><h3>Pixel stride</h3><p>Android 等多 plane API 中，U/V 样本之间可能隔 1 或 2 bytes，不能假定连续。</p><b>症状：色度呈条纹</b></article>
        <article><span>03 · ORDER</span><h3>UV 还是 VU</h3><p>NV12 与 NV21、I420 与 YV12 都是 4:2:0，却交换了 U/V 顺序。</p><b>症状：红蓝严重互换</b></article>
        <article><span>04 · COLOR</span><h3>601 / 709 + Range</h3><p>矩阵与量化范围都属于源描述。Limited 被当 Full 会导致灰黑、对比度异常。</p><b>症状：整体偏色或发灰</b></article>
        <article><span>05 · GEOMETRY</span><h3>Crop / Odd size</h3><p>4:2:0 色度按 2×2 对齐。奇数尺寸、裁剪起点与边界需要明确取整策略。</p><b>症状：边缘色块、越界</b></article>
        <article><span>06 · OUTPUT</span><h3>RGB / BGR + Endian</h3><p>确认通道顺序、RGB565 位段和内存字节序。数值 0xF800 才代表标准 RGB565 红色。</p><b>症状：红蓝互换、颜色离散</b></article>
      </div>

      <div class="debug-flow reveal">
        <div><span>看到问题</span><b>花屏 / 偏色 / 错行</b></div><i>→</i>
        <div><span>先打印元数据</span><b>format · size · strides</b></div><i>→</i>
        <div><span>再抓取小区域</span><b>4×2 bytes 对照图谱</b></div><i>→</i>
        <div class="finish"><span>最后验证</span><b>灰阶 + 红绿蓝色块</b></div>
      </div>
    </section>

    <section class="closing section-shell reveal">
      <div class="closing-mark">Y</div>
      <div>
        <span class="eyebrow"><span></span> FRAME DECODED</span>
        <h2>现在，你看到的不只是<br><em>一串 bytes。</em></h2>
        <p>记住顺序：<strong>采样关系 → 内存布局 → 矩阵与范围 → RGB 打包。</strong></p>
      </div>
      <a href="#top" class="back-top" aria-label="返回顶部">↑</a>
    </section>
  </main>

  <footer><span>Camera YUV · Interactive Knowledge Graph</span><span>Built with Three.js</span></footer>
`;

const colors = {
  paper: 0xf3f0e8,
  ink: 0x171713,
  orange: 0xe85a2a,
  blue: 0x3178f6,
  red: 0xf05252,
  lime: 0xd5f53c,
  y: 0xf5c84c,
};

let motionEnabled = true;
const scenes = [];

function makeRenderer(canvas, alpha = true) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

function fitRenderer(renderer, camera) {
  const canvas = renderer.domElement;
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  const targetWidth = Math.floor(width * renderer.getPixelRatio());
  const targetHeight = Math.floor(height * renderer.getPixelRatio());
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function tileMaterial(color, opacity = 1) {
  return new THREE.MeshStandardMaterial({ color, roughness: .58, metalness: .02, transparent: opacity < 1, opacity });
}

function addPixelGrid(group, { columns, rows, z, color, gap = .08, width = .58, height = .58, opacity = 1 }) {
  const material = tileMaterial(color, opacity);
  const geometry = new THREE.BoxGeometry(width, height, .09);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const tile = new THREE.Mesh(geometry, material);
      tile.position.set((x - (columns - 1) / 2) * (width + gap), ((rows - 1) / 2 - y) * (height + gap), z);
      group.add(tile);
    }
  }
}

function initHero() {
  const canvas = document.querySelector('#hero-canvas');
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  camera.position.set(5.6, 4.7, 7.4);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 6;
  controls.maxDistance = 11;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb6b0a3, 2.7));
  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(4, 7, 7);
  scene.add(key);

  const stack = new THREE.Group();
  stack.rotation.set(-.32, -.4, -.08);
  scene.add(stack);

  const yPlane = new THREE.Group();
  addPixelGrid(yPlane, { columns: 6, rows: 4, z: 0, color: colors.y, gap: .07 });
  stack.add(yPlane);
  const uPlane = new THREE.Group();
  addPixelGrid(uPlane, { columns: 3, rows: 2, z: 1.05, color: colors.blue, gap: .12, width: 1.08, height: 1.08, opacity: .92 });
  stack.add(uPlane);
  const vPlane = new THREE.Group();
  addPixelGrid(vPlane, { columns: 3, rows: 2, z: 2.1, color: colors.red, gap: .12, width: 1.08, height: 1.08, opacity: .88 });
  stack.add(vPlane);

  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(4.1, 2.8, 2.25)),
    new THREE.LineBasicMaterial({ color: 0x99958b, transparent: true, opacity: .36 }),
  );
  frame.position.z = 1.05;
  stack.add(frame);

  const rgbBar = new THREE.Group();
  const rgbColors = [0xf05252, 0x4dbb75, 0x3178f6];
  rgbColors.forEach((color, index) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(.18, .65, .18), tileMaterial(color));
    bar.position.set(-.24 + index * .24, -2.35, 1.05);
    rgbBar.add(bar);
  });
  stack.add(rgbBar);

  function render(time) {
    fitRenderer(renderer, camera);
    if (motionEnabled) {
      stack.position.y = Math.sin(time * .0007) * .08;
      uPlane.position.z = Math.sin(time * .0006) * .07;
      vPlane.position.z = Math.sin(time * .0006 + 1.2) * .07;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  scenes.push(render);
}

function clamp8(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToYuv(r, g, b) {
  return {
    y: clamp8(.299 * r + .587 * g + .114 * b),
    u: clamp8(-.168736 * r - .331264 * g + .5 * b + 128),
    v: clamp8(.5 * r - .418688 * g - .081312 * b + 128),
  };
}

function initChannelLab() {
  const width = 240;
  const height = 150;
  const source = document.querySelector('#source-pattern');
  const canvases = {
    y: document.querySelector('#plane-y'),
    u: document.querySelector('#plane-u'),
    v: document.querySelector('#plane-v'),
  };
  [source, ...Object.values(canvases)].forEach((canvas) => {
    canvas.width = width;
    canvas.height = height;
  });
  const sourceCtx = source.getContext('2d');
  const contexts = Object.fromEntries(Object.entries(canvases).map(([key, canvas]) => [key, canvas.getContext('2d')]));
  const sourceImage = sourceCtx.createImageData(width, height);
  const planeImages = Object.fromEntries(Object.entries(contexts).map(([key, context]) => [key, context.createImageData(width, height)]));

  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const nx = px / width;
      const ny = py / height;
      const band = Math.floor(nx * 6);
      const palette = [[234, 82, 55], [240, 181, 54], [79, 178, 108], [49, 123, 227], [112, 85, 191], [226, 88, 152]];
      const base = palette[Math.min(5, band)];
      const shade = .42 + .58 * (1 - ny);
      const radial = Math.hypot(nx - .5, ny - .48) < .21 ? 1.16 : 1;
      const r = clamp8(base[0] * shade * radial);
      const g = clamp8(base[1] * shade * radial);
      const b = clamp8(base[2] * shade * radial);
      const { y, u, v } = rgbToYuv(r, g, b);
      const offset = (py * width + px) * 4;
      sourceImage.data.set([r, g, b, 255], offset);
      planeImages.y.data.set([y, y, y, 255], offset);
      planeImages.u.data.set([clamp8(36 + u * .16), clamp8(80 + u * .42), clamp8(100 + u * 1.1), 255], offset);
      planeImages.v.data.set([clamp8(90 + v * .95), clamp8(50 + v * .2), clamp8(48 + v * .2), 255], offset);
    }
  }
  sourceCtx.putImageData(sourceImage, 0, 0);
  Object.keys(contexts).forEach((key) => contexts[key].putImageData(planeImages[key], 0, 0));

  const marker = document.querySelector('#sample-marker');
  const readouts = {
    y: document.querySelector('#sample-y'),
    u: document.querySelector('#sample-u'),
    v: document.querySelector('#sample-v'),
  };
  const swatch = document.querySelector('#sample-color');

  function sampleAt(clientX, clientY) {
    const rect = source.getBoundingClientRect();
    const nx = Math.max(0, Math.min(.999, (clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(.999, (clientY - rect.top) / rect.height));
    const px = Math.floor(nx * width);
    const py = Math.floor(ny * height);
    const offset = (py * width + px) * 4;
    const [r, g, b] = sourceImage.data.slice(offset, offset + 3);
    const yuv = rgbToYuv(r, g, b);
    Object.keys(readouts).forEach((key) => { readouts[key].textContent = yuv[key]; });
    swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    marker.style.left = `${source.offsetLeft + nx * source.clientWidth}px`;
    marker.style.top = `${source.offsetTop + ny * source.clientHeight}px`;
  }
  source.addEventListener('pointermove', (event) => sampleAt(event.clientX, event.clientY));
  source.addEventListener('pointerdown', (event) => sampleAt(event.clientX, event.clientY));
  const rect = source.getBoundingClientRect();
  sampleAt(rect.left + rect.width * .72, rect.top + rect.height * .38);
}

function initSampling() {
  const canvas = document.querySelector('#sampling-canvas');
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  camera.position.set(5.8, 4.6, 7.5);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 5.5;
  controls.maxDistance = 10;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x24251f, 2.5));
  const key = new THREE.DirectionalLight(0xffffff, 3.5);
  key.position.set(3, 6, 6);
  scene.add(key);

  const root = new THREE.Group();
  root.rotation.set(-.35, -.35, -.04);
  scene.add(root);
  const yGroup = new THREE.Group();
  addPixelGrid(yGroup, { columns: 4, rows: 4, z: 0, color: colors.y, gap: .08, width: .68, height: .68 });
  root.add(yGroup);
  const chromaGroup = new THREE.Group();
  root.add(chromaGroup);

  const data = {
    444: { columns: 4, rows: 4, width: .68, height: .68, count: 16, ratio: '100%', title: '每个 Y，都有自己的 U 与 V', copy: '亮度和色度保持相同分辨率。每个像素需要 1Y + 1U + 1V，共 3 bytes；质量高，带宽也最高。' },
    422: { columns: 2, rows: 4, width: 1.44, height: .68, count: 8, ratio: '67%', title: '每横向 2 个 Y，共享 1 组 U/V', copy: '水平方向的色度减半，垂直方向保留。2 个像素需要 2Y + 1U + 1V，共 4 bytes。' },
    420: { columns: 2, rows: 2, width: 1.44, height: 1.44, count: 4, ratio: '50%', title: '每 2×2 个 Y，共享 1 组 U/V', copy: '水平和垂直方向的色度分辨率都减半。4 个像素需要 4 个 Y、1 个 U、1 个 V，共 6 bytes。' },
  };
  let current = '420';

  function rebuild(type) {
    current = type;
    while (chromaGroup.children.length) {
      const child = chromaGroup.children.pop();
      child.geometry.dispose();
      child.material.dispose();
    }
    const entry = data[type];
    addPixelGrid(chromaGroup, { columns: entry.columns, rows: entry.rows, z: .95, color: colors.blue, gap: .08, width: entry.width, height: entry.height, opacity: .88 });
    addPixelGrid(chromaGroup, { columns: entry.columns, rows: entry.rows, z: 1.9, color: colors.red, gap: .08, width: entry.width, height: entry.height, opacity: .82 });
    document.querySelector('#sampling-ratio').textContent = entry.ratio;
    document.querySelector('#sampling-title').textContent = entry.title;
    document.querySelector('#sampling-copy').textContent = entry.copy;
    document.querySelector('#count-u').textContent = entry.count;
    document.querySelector('#count-v').textContent = entry.count;
    document.querySelectorAll('[data-sampling]').forEach((button) => button.classList.toggle('active', button.dataset.sampling === type));
    document.querySelectorAll('.sampling-cards article').forEach((card, index) => card.classList.toggle('selected', ['444', '422', '420'][index] === type));
  }
  document.querySelectorAll('[data-sampling]').forEach((button) => button.addEventListener('click', () => rebuild(button.dataset.sampling)));
  rebuild(current);

  function render(time) {
    fitRenderer(renderer, camera);
    if (motionEnabled) {
      chromaGroup.position.z = Math.sin(time * .0007) * .08;
      root.rotation.z = -.04 + Math.sin(time * .00025) * .025;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  scenes.push(render);
}

const formatCatalog = {
  I420: {
    className: 'PLANAR · 4:2:0', name: 'I420 / YU12', description: '先存完整 Y 平面，再存 U 平面，最后存 V 平面。三个 plane 完全分离。', order: 'Y → U → V', bpp: '12 bpp', key: 'U plane 在 V plane 前', total: '12 bytes',
    rows: [{ label: 'Y PLANE', values: ['Y0','Y1','Y2','Y3','Y4','Y5','Y6','Y7'] }, { label: 'U PLANE', values: ['U0','U1'] }, { label: 'V PLANE', values: ['V0','V1'] }],
  },
  YV12: {
    className: 'PLANAR · 4:2:0', name: 'YV12', description: '与 I420 拥有相同采样率，但 V plane 排在 U plane 前。把它误读为 I420 会交换红蓝色差。', order: 'Y → V → U', bpp: '12 bpp', key: 'V plane 在 U plane 前', total: '12 bytes',
    rows: [{ label: 'Y PLANE', values: ['Y0','Y1','Y2','Y3','Y4','Y5','Y6','Y7'] }, { label: 'V PLANE', values: ['V0','V1'] }, { label: 'U PLANE', values: ['U0','U1'] }],
  },
  NV12: {
    className: 'SEMI-PLANAR · 4:2:0', name: 'NV12', description: 'Y plane 独立；色度 plane 中 U、V 成对交错。硬件编解码器与相机链路中十分常见。', order: 'Y → UV UV…', bpp: '12 bpp', key: '色度对从 U 开始', total: '12 bytes',
    rows: [{ label: 'Y PLANE', values: ['Y0','Y1','Y2','Y3','Y4','Y5','Y6','Y7'] }, { label: 'UV PLANE', values: ['U0','V0','U1','V1'] }],
  },
  NV21: {
    className: 'SEMI-PLANAR · 4:2:0', name: 'NV21', description: 'Y plane 独立；色度交错顺序为 VU。与 NV12 只有一个字母的差别，却会造成明显偏色。', order: 'Y → VU VU…', bpp: '12 bpp', key: '色度对从 V 开始', total: '12 bytes',
    rows: [{ label: 'Y PLANE', values: ['Y0','Y1','Y2','Y3','Y4','Y5','Y6','Y7'] }, { label: 'VU PLANE', values: ['V0','U0','V1','U1'] }],
  },
  YUYV: {
    className: 'PACKED · 4:2:2', name: 'YUYV / YUY2', description: '每两个横向像素组成一组：两个独立 Y，共享一组 U/V。所有分量在同一条 byte stream 中。', order: 'Y0 U0 Y1 V0', bpp: '16 bpp', key: '每组第一个 byte 是 Y', total: '16 bytes',
    rows: [{ label: 'ROW 0', values: ['Y0','U0','Y1','V0','Y2','U1','Y3','V1'] }, { label: 'ROW 1', values: ['Y4','U2','Y5','V2','Y6','U3','Y7','V3'] }],
  },
  UYVY: {
    className: 'PACKED · 4:2:2', name: 'UYVY', description: '同样是 4:2:2 packed，但每组先出现 U，再交替出现 Y、V、Y。常见于采集卡和视频接口。', order: 'U0 Y0 V0 Y1', bpp: '16 bpp', key: '每组第一个 byte 是 U', total: '16 bytes',
    rows: [{ label: 'ROW 0', values: ['U0','Y0','V0','Y1','U1','Y2','V1','Y3'] }, { label: 'ROW 1', values: ['U2','Y4','V2','Y5','U3','Y6','V3','Y7'] }],
  },
};

function cellType(value) {
  if (value.startsWith('Y')) return 'y';
  if (value.startsWith('U')) return 'u';
  return 'v';
}

function initMemoryAtlas() {
  const rowsHost = document.querySelector('#memory-rows');
  const outputs = {
    className: document.querySelector('#format-class'),
    name: document.querySelector('#format-name'),
    description: document.querySelector('#format-desc'),
    order: document.querySelector('#format-order'),
    bpp: document.querySelector('#format-bpp'),
    key: document.querySelector('#format-key'),
    total: document.querySelector('#format-total'),
  };

  function setFormat(format) {
    const entry = formatCatalog[format];
    rowsHost.innerHTML = entry.rows.map((row) => `<div class="memory-row"><span>${row.label}</span><div class="byte-cells">${row.values.map((value, index) => `<i class="byte-cell ${cellType(value)}"><small>+${index}</small>${value}</i>`).join('')}</div></div>`).join('');
    Object.keys(outputs).forEach((key) => { outputs[key].textContent = entry[key]; });
    document.querySelectorAll('[data-format]').forEach((button) => {
      const selected = button.dataset.format === format;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
    });
  }
  document.querySelectorAll('[data-format]').forEach((button) => button.addEventListener('click', () => setFormat(button.dataset.format)));
  setFormat('I420');
}

function yuvToRgb(y, u, v, matrix, range) {
  const d = u - 128;
  const e = v - 128;
  let r;
  let g;
  let b;
  if (range === 'limited') {
    const c = y - 16;
    if (matrix === '709') {
      r = Math.floor((298 * c + 459 * e + 128) / 256);
      g = Math.floor((298 * c - 55 * d - 136 * e + 128) / 256);
      b = Math.floor((298 * c + 541 * d + 128) / 256);
    } else {
      r = Math.floor((298 * c + 409 * e + 128) / 256);
      g = Math.floor((298 * c - 100 * d - 208 * e + 128) / 256);
      b = Math.floor((298 * c + 516 * d + 128) / 256);
    }
  } else if (matrix === '709') {
    r = y + 1.5748 * e;
    g = y - .187324 * d - .468124 * e;
    b = y + 1.8556 * d;
  } else {
    r = y + 1.402 * e;
    g = y - .344136 * d - .714136 * e;
    b = y + 1.772 * d;
  }
  return { r: clamp8(r), g: clamp8(g), b: clamp8(b) };
}

function hexByte(value) {
  return value.toString(16).padStart(2, '0').toUpperCase();
}

function initConverter() {
  const sliders = {
    y: document.querySelector('#y-slider'),
    u: document.querySelector('#u-slider'),
    v: document.querySelector('#v-slider'),
  };
  const matrixSelect = document.querySelector('#matrix-select');
  const rangeSelect = document.querySelector('#range-select');

  function update() {
    const y = Number(sliders.y.value);
    const u = Number(sliders.u.value);
    const v = Number(sliders.v.value);
    const matrix = matrixSelect.value;
    const range = rangeSelect.value;
    const { r, g, b } = yuvToRgb(y, u, v, matrix, range);
    ['y', 'u', 'v'].forEach((key) => { document.querySelector(`#${key}-output`).textContent = sliders[key].value; });
    ['r', 'g', 'b'].forEach((key) => {
      document.querySelector(`#${key}-value`).textContent = { r, g, b }[key];
      document.querySelector(`#${key}-bar`).style.width = `${{ r, g, b }[key] / 255 * 100}%`;
    });
    const hex = `#${hexByte(r)}${hexByte(g)}${hexByte(b)}`;
    document.querySelector('#color-preview').style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    document.querySelector('#preview-hex').textContent = hex;
    document.querySelector('#rgb888-value').textContent = `${hexByte(r)} ${hexByte(g)} ${hexByte(b)}`;
    const packed = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
    const packedHex = packed.toString(16).padStart(4, '0').toUpperCase();
    document.querySelector('#rgb565-value').textContent = `0x${packedHex}`;
    document.querySelector('#rgb565-bytes').textContent = `Little-endian bytes: ${hexByte(packed & 0xff)} ${hexByte(packed >> 8)}`;
    const title = `BT.${matrix} ${range === 'limited' ? 'Limited' : 'Full'}`;
    document.querySelector('#matrix-note-title').textContent = title;
    document.querySelector('#matrix-formula').textContent = range === 'limited'
      ? 'C=Y−16 · D=U−128 · E=V−128'
      : 'Y 保持原值 · D=U−128 · E=V−128';
  }
  [...Object.values(sliders), matrixSelect, rangeSelect].forEach((control) => control.addEventListener('input', update));
  update();
}

function initSafely(initializer, canvasSelector) {
  try {
    initializer();
  } catch (error) {
    console.warn(`${initializer.name} unavailable:`, error);
    const canvas = canvasSelector ? document.querySelector(canvasSelector) : null;
    canvas?.closest('.canvas-shell, .sampling-card')?.classList.add('webgl-fallback');
  }
}

initSafely(initHero, '#hero-canvas');
initChannelLab();
initSafely(initSampling, '#sampling-canvas');
initMemoryAtlas();
initConverter();

function animate(time) {
  scenes.forEach((render) => render(time));
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

document.querySelector('#toggle-motion').addEventListener('click', (event) => {
  motionEnabled = !motionEnabled;
  event.currentTarget.innerHTML = motionEnabled
    ? '<span class="play-dot">Ⅱ</span> 暂停动画'
    : '<span class="play-dot">▶</span> 继续动画';
});

document.querySelector('#copy-code').addEventListener('click', async (event) => {
  const code = `int c = y - 16;\nint d = u - 128;\nint e = v - 128;\nr = clip8((298*c + 409*e + 128) >> 8);\ng = clip8((298*c - 100*d - 208*e + 128) >> 8);\nb = clip8((298*c + 516*d + 128) >> 8);\nrgb565 = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);`;
  try {
    await navigator.clipboard.writeText(code);
    event.currentTarget.textContent = '已复制 ✓';
    window.setTimeout(() => { event.currentTarget.textContent = '复制核心代码'; }, 1600);
  } catch {
    event.currentTarget.textContent = '复制失败';
  }
});

const progress = document.querySelector('#reading-progress');
function updateProgress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = `${max > 0 ? Math.min(100, scrollY / max * 100) : 0}%`;
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .1 });
document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

window.addEventListener('resize', () => scenes.forEach((render) => render(performance.now())));
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) motionEnabled = false;

if (window.location.hash) {
  const hashTarget = document.querySelector(window.location.hash);
  hashTarget?.scrollIntoView();
  requestAnimationFrame(() => hashTarget?.scrollIntoView());
}
