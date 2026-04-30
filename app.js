const entryCards = document.querySelectorAll(".entry-card");
const panels = document.querySelectorAll(".tool-panel");

const previews = {
  event: document.getElementById("eventImagePreview"),
  caption: document.getElementById("captionImagePreview"),
  video: document.getElementById("summaryVideoPreview"),
};

const files = {
  event: null,
  caption: null,
  video: null,
};

entryCards.forEach((card) => {
  card.addEventListener("click", () => {
    const target = card.dataset.target;

    entryCards.forEach((item) => item.classList.toggle("active", item === card));
    panels.forEach((panel) => panel.classList.toggle("active", panel.id === target));
  });
});

bindImageInput("eventImage", "event");
bindImageInput("captionImage", "caption");
bindVideoInput("summaryVideo", "video");

document.querySelectorAll(".run-btn").forEach((button) => {
  button.addEventListener("click", async () => {
    const mode = button.dataset.run;

    if (mode === "event") {
      runEventAnalysis();
      return;
    }

    if (mode === "caption") {
      runImageCaption();
      return;
    }

    if (mode === "video") {
      await runVideoSummary();
    }
  });
});

function bindImageInput(inputId, key) {
  const input = document.getElementById(inputId);

  input.addEventListener("change", () => {
    const [file] = input.files || [];
    files[key] = file || null;

    if (!file) {
      renderEmptyPreview(previews[key], "图片预览区域");
      return;
    }

    const url = URL.createObjectURL(file);
    previews[key].innerHTML = `<img src="${url}" alt="${file.name}" />`;
  });
}

function bindVideoInput(inputId, key) {
  const input = document.getElementById(inputId);

  input.addEventListener("change", () => {
    const [file] = input.files || [];
    files[key] = file || null;

    if (!file) {
      renderEmptyPreview(previews[key], "视频预览区域");
      return;
    }

    const url = URL.createObjectURL(file);
    previews[key].innerHTML = `<video src="${url}" controls></video>`;
  });
}

function renderEmptyPreview(container, text) {
  container.innerHTML = `<p>${text}</p>`;
}

function runEventAnalysis() {
  const file = files.event;
  const rule = document.getElementById("eventRule").value.trim();
  const result = document.getElementById("eventResult");

  if (!file || !rule) {
    result.innerHTML = buildMessageCard("请先上传图片，并填写判断规则。");
    return;
  }

  const eventOccurred = assessRule(rule);
  const relatedDescription = [
    `图像中可见主体与场景信息较集中，适合围绕“${rule}”进行定向分析。`,
    `从画面构成看，系统会优先关注与规则相关的人物、动作、装备、环境边界和异常状态。`,
    `当前演示结果基于上传素材名称、基础属性和规则关键词生成，用于展示交互流程。`,
  ].join("");

  result.innerHTML = `
    <div class="result-layout">
      <div class="result-block">
        <h3>相关图像描述</h3>
        <p>${relatedDescription}</p>
      </div>
      <div class="result-block">
        <h3>事件判断结果</h3>
        <div class="status-row">
          ${buildStatusChip(eventOccurred ? "已发生" : "未发生", eventOccurred ? "success" : "warning")}
          <p>${eventOccurred ? "规则中包含明显的风险/异常类特征词，演示引擎判定目标事件成立。" : "规则更偏向一般场景描述，演示引擎暂未识别出明确的事件触发信号。"}</p>
        </div>
      </div>
      <div class="result-block">
        <h3>分析依据</h3>
        <div class="meta-list">
          <div class="meta-item"><strong>规则提取</strong><span>${escapeHtml(rule)}</span></div>
          <div class="meta-item"><strong>图片文件</strong><span>${escapeHtml(file.name)}</span></div>
        </div>
      </div>
    </div>
  `;
}

function runImageCaption() {
  const file = files.caption;
  const focus = document.getElementById("captionFocus").value.trim();
  const result = document.getElementById("captionResult");

  if (!file || !focus) {
    result.innerHTML = buildMessageCard("请先上传图片，并填写关注方向。");
    return;
  }

  const descriptions = [
    `围绕“${focus}”，系统会重点描述画面中的主体位置、动作姿态与场景关系。`,
    `该图片在视觉上呈现出较明确的关注对象，适合生成面向业务关注点的结构化描述。`,
    `如果后续接入真实识别能力，这里可以扩展成标签、目标框、风险点和建议动作等内容。`,
  ];

  result.innerHTML = `
    <div class="result-layout">
      <div class="result-block">
        <h3>关注方向相关描述</h3>
        <div class="meta-list">
          ${descriptions
            .map(
              (item, index) => `
                <div class="meta-item">
                  <strong>描述 ${index + 1}</strong>
                  <span>${item}</span>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
      <div class="result-block">
        <h3>分析参数</h3>
        <div class="meta-list">
          <div class="meta-item"><strong>关注方向</strong><span>${escapeHtml(focus)}</span></div>
          <div class="meta-item"><strong>图片文件</strong><span>${escapeHtml(file.name)}</span></div>
        </div>
      </div>
    </div>
  `;
}

async function runVideoSummary() {
  const file = files.video;
  const focus = document.getElementById("videoFocus").value.trim();
  const result = document.getElementById("videoResult");

  if (!file || !focus) {
    result.innerHTML = buildMessageCard("请先上传视频，并填写关注方向。");
    return;
  }

  result.innerHTML = buildMessageCard("正在生成逐帧摘要，请稍候...");

  try {
    const frames = await captureFrames(file, 4);
    const frameDescriptions = frames.map((frame, index) => ({
      ...frame,
      description: `在 ${formatTime(frame.time)} 附近，画面重点可围绕“${focus}”观察主体变化、动作延续和场景上下文。该帧适合作为阶段 ${index + 1} 的关键截图。`,
    }));

    const summary = `基于“${focus}”的关注方向，整段视频呈现出由前段观察、中段变化到后段收束的过程。逐帧结果显示画面内容具备连续性，适合进一步接入真实模型生成事件轨迹、风险判断和完整视频摘要。`;

    result.innerHTML = `
      <div class="result-layout">
        <div class="result-block">
          <h3>逐帧描述</h3>
          <div class="timeline-list">
            ${frameDescriptions
              .map(
                (frame, index) => `
                  <div class="timeline-item">
                    <strong>关键帧 ${index + 1} · ${formatTime(frame.time)}</strong>
                    <span>${frame.description}</span>
                    <img src="${frame.dataUrl}" alt="关键帧 ${index + 1}" />
                  </div>
                `,
              )
              .join("")}
          </div>
        </div>
        <div class="result-block">
          <h3>视频摘要总结</h3>
          <p>${summary}</p>
        </div>
        <div class="result-block">
          <h3>分析参数</h3>
          <div class="meta-list">
            <div class="meta-item"><strong>关注方向</strong><span>${escapeHtml(focus)}</span></div>
            <div class="meta-item"><strong>视频文件</strong><span>${escapeHtml(file.name)}</span></div>
            <div class="meta-item"><strong>关键帧数量</strong><span>${frameDescriptions.length} 张</span></div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    result.innerHTML = buildMessageCard(`视频解析失败：${escapeHtml(error.message)}`);
  }
}

async function captureFrames(file, count) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";

  await waitForEvent(video, "loadedmetadata");

  const duration = Math.max(video.duration || 0, 1);
  const times = Array.from({ length: count }, (_, index) => {
    const ratio = (index + 1) / (count + 1);
    return Number((duration * ratio).toFixed(2));
  });

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 360;
  const context = canvas.getContext("2d");

  const frames = [];
  for (const time of times) {
    video.currentTime = Math.min(time, duration - 0.1);
    await waitForEvent(video, "seeked");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    frames.push({
      time,
      dataUrl: canvas.toDataURL("image/jpeg", 0.86),
    });
  }

  URL.revokeObjectURL(url);
  return frames;
}

function waitForEvent(target, eventName) {
  return new Promise((resolve, reject) => {
    const onSuccess = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("媒体文件无法完成解析"));
    };

    const cleanup = () => {
      target.removeEventListener(eventName, onSuccess);
      target.removeEventListener("error", onError);
    };

    target.addEventListener(eventName, onSuccess, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

function assessRule(rule) {
  return /未|异常|违规|风险|危险|跌倒|闯入|明火|烟雾|告警|摔倒|未佩戴/.test(rule);
}

function buildMessageCard(message) {
  return `<div class="placeholder-result"><p>${escapeHtml(message)}</p></div>`;
}

function buildStatusChip(label, type) {
  return `<span class="status-chip ${type}">${escapeHtml(label)}</span>`;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
