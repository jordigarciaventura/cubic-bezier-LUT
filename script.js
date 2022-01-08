let bezierPlot, samplesSlider, samplesText, textArea;

let samples = 101;
let minValue = 0;
let maxValue = 1;
let precission = 2;
let scale = Math.pow(10, precission);

let values;

function setTextArea() {
  textArea.innerText = values
    .map((v) => {
      return Math.round(lerp(minValue, maxValue, v) * scale) / scale;
    })
    .join(", ");
}

function calculateValues() {
  values = getCubicBezierPoints(
    bezierPlot.normalizedControlPoint1X,
    bezierPlot.normalizedControlPoint1Y,
    bezierPlot.normalizedControlPoint2X,
    bezierPlot.normalizedControlPoint2Y,
    samples
  );
  bezierPlot.samples = values;
  bezierPlot.draw();
  setTextArea();
}

window.onload = () => {
  // REFERENCES

  const canvas = document.getElementById("canvas-bezier");
  bezierPlot = new BezierPlot(canvas);

  samplesSlider = document.getElementById("slider-samples");
  samplesText = document.getElementById("textbox-samples");
  textArea = document.getElementById("textarea-lut");

  // EVENTS

  samplesSlider.addEventListener("input", () => {
    samplesText.value = samplesSlider.value;
    samples = samplesSlider.value;

    calculateValues();
  });

  samplesText.addEventListener("change", () => {
    if (!samplesText.value) {
      samplesText.value = samples;
      return;
    }
    if (samplesText.value > 2) {
      samples = samplesText.value;
      samplesSlider.value = clamp(2, 100, samplesText.value);
    } else {
      samplesText.value = 2;
      samples = 2;
      samplesSlider.value = 2;
    }

    calculateValues();
  });

  const minText = document.getElementById("text-min");
  minText.addEventListener("change", () => {
    if (!minText.value) {
      minText.value = minValue;
      return;
    }
    minValue = parseFloat(minText.value);

    setTextArea();
  });

  const maxText = document.getElementById("text-max");
  maxText.addEventListener("change", () => {
    if (!maxText.value) {
      maxText.value = maxValue;
      return;
    }
    maxValue = parseFloat(maxText.value);

    setTextArea();
  });

  const precissionText = document.getElementById("text-precission");
  precissionText.addEventListener("change", () => {
    if (!precissionText.value) {
      precissionText.value = precission;
      return;
    }
    const precissionValue = Math.round(parseInt(precissionText.value));
    if (0 <= precissionValue && precissionValue <= 6) {
      precissionText.value = precission = precissionValue;
    } else if (precissionValue < 0) {
      precissionText.value = precission = 0;
    } else {
      precissionText.value = precission = 6;
    }
    scale = Math.pow(10, precission);
    setTextArea();
  });

  const copyButton = document.getElementById("btn-copy");
  copyButton.addEventListener("click", () => {
    const tmpTextArea = document.createElement("textarea");
    tmpTextArea.innerText = textArea.innerText;
    tmpTextArea.style.visibility = "hidden";
    tmpTextArea.style.display = "none";
    document.body.appendChild(tmpTextArea);
    tmpTextArea.select();
    tmpTextArea.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(tmpTextArea.value);
  });

  calculateValues();
};

function solveCubic(a, b, c, d) {
  const evaluate = (x) => a * x * x * x + b * x * x + c * x + d;
  const isZero = (v) => Math.abs(v) <= 0.001;
  let leftX = 0;
  let rightX = 1;
  let leftY = evaluate(leftX);
  let rightY = evaluate(rightX);
  if (isZero(leftY)) return leftX;
  if (isZero(rightY)) return rightX;

  for (let i = 0; i < 100; i++) {
    const midX = (leftX + rightX) / 2;
    const midY = evaluate(midX);
    if (isZero(midY)) return midX;

    if (midY < 0 && leftY < 0) {
      leftX = midX;
    } else {
      rightX = midX;
    }
  }
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function lerp(min, max, t) {
  return min + (max - min) * t;
}

function inverseLerp(min, max, value) {
  return (value - min) / (max - min);
}

function getCubicBezierPoints(
  normalizedControlPoint1X,
  normalizedControlPoint1Y,
  normalizedControlPoint2X,
  normalizedControlPoint2Y,
  count
) {
  function evaluateY(t) {
    return (
      3 * Math.pow(1 - t, 2) * t * normalizedControlPoint1Y +
      3 * (1 - t) * Math.pow(t, 2) * normalizedControlPoint2Y +
      Math.pow(t, 3)
    );
  }

  function evaluateT(x) {
    const b = normalizedControlPoint1X;
    const c = normalizedControlPoint2X;

    return solveCubic(3 * b - 3 * c + 1, -6 * b + 3 * c, 3 * b, -x);
  }

  let values = [];
  for (let i = 0; i < count; i++) {
    values.push(evaluateY(evaluateT(i / (count - 1))));
  }
  return values;
}

class BezierPlot {
  constructor(canvas) {
    this.canvas = canvas;
    this.curveColor = "#EF5DA8";
    this.pointColor = "#FCDDEC";
    this.backgroundColor = "#272727";
    this.gridColor = "#5A5A5A";

    this.ctx = canvas.getContext("2d");
    this.rect = canvas.getBoundingClientRect();
    this.margin = 20;

    this.startPointX = this.controlPoint1X = this.margin;
    this.startPointY = this.controlPoint1Y = this.rect.height - this.margin;
    this.endPointX = this.controlPoint2X = this.rect.width - this.margin;
    this.endPointY = this.controlPoint2Y = this.margin;

    this.normalizedControlPoint1X = 0;
    this.normalizedControlPoint1Y = 0;
    this.normalizedControlPoint2X = 1;
    this.normalizedControlPoint2Y = 1;

    this.samples = [];

    this.handle1 = new HandlePlot(
      this.ctx,
      this.startPointX,
      this.startPointY,
      this.controlPoint1X,
      this.controlPoint1Y
    );
    this.handle2 = new HandlePlot(
      this.ctx,
      this.endPointX,
      this.endPointY,
      this.controlPoint2X,
      this.controlPoint2Y
    );

    this.canvas.onmousedown = (e) => {
      const [x, y] = this.clampPosition(e.x, e.y);

      if (this.handle1.collision(x, y)) {
        this.handle1.isDragging = true;
        this.anyHandleDragging = true;
        this.setControlPoint1(x, y);
      } else if (this.handle2.collision(x, y)) {
        this.handle2.isDragging = true;
        this.anyHandleDragging = true;
        this.setControlPoint2(x, y);
      }

      calculateValues();
    };

    this.anyHandleHighlighted = false;
    this.anyHandleDragging = false;

    this.canvas.onmousemove = (e) => {
      if (this.anyHandleDragging) return;

      const [x, y] = this.clampPosition(e.x, e.y);
      if (this.handle1.collision(x, y)) {
        this.handle1.highlight = true;
        this.handle2.highlight = false;
        this.anyHandleHighlighted = true;
        this.canvas.style.cursor = "pointer";
        this.draw();
      } else if (this.handle2.collision(x, y)) {
        this.handle2.highlight = true;
        this.handle1.highlight = false;
        this.anyHandleHighlighted = true;
        this.canvas.style.cursor = "pointer";
        this.draw();
      } else if (this.anyHandleHighlighted && !this.anyHandleDragging) {
        this.handle1.highlight = false;
        this.handle2.highlight = false;
        this.anyHandleHighlighted = false;
        this.canvas.style.cursor = "default";
        this.draw();
      }
    };

    this.canvas.addEventListener("mouseout", (e) => {
      if (
        this.anyHandleHighlighted &&
        !(this.handle1.isDragging || this.handle2.isDragging)
      ) {
        this.handle1.highlight = false;
        this.handle2.highlight = false;
        this.anyHandleHighlighted = false;
        this.canvas.style.cursor = "default";
        this.draw();
      }
    });

    document.onmousemove = (e) => {
      if (this.handle1.isDragging || this.handle2.isDragging) {
        const [x, y] = this.clampPosition(e.x, e.y);
        if (this.handle1.isDragging) {
          this.setControlPoint1(x, y);
        } else {
          this.setControlPoint2(x, y);
        }

        calculateValues();
      }
    };

    document.onmouseup = (e) => {
      if (this.anyHandleDragging) {
        this.handle1.isDragging = false;
        this.handle2.isDragging = false;
        this.anyHandleDragging = false;
      }

      if (this.anyHandleHighlighted) {
        if (
          !this.handle1.collision(e.x - this.rect.left, e.y - this.rect.top)
        ) {
          this.handle1.highlight = false;
          this.anyHandleHighlighted = false;
          this.draw();
        }
        if (
          !this.handle2.collision(e.x - this.rect.left, e.y - this.rect.top)
        ) {
          this.handle2.highlight = false;
          this.anyHandleHighlighted = false;
          this.draw();
        }
      }
    };

    window.addEventListener("resize", () => {
      this.updateRect();
    });

    window.addEventListener("scroll", () => {
      this.updateRect();
    });
  }

  setControlPoint1(x, y) {
    this.controlPoint1X = x;
    this.controlPoint1Y = y;
    this.handle1.setPosition(x, y);

    this.normalizedControlPoint1X = inverseLerp(
      this.startPointX,
      this.endPointX,
      x
    );
    this.normalizedControlPoint1Y = inverseLerp(
      this.startPointY,
      this.endPointY,
      y
    );
  }

  setControlPoint2(x, y) {
    this.controlPoint2X = x;
    this.controlPoint2Y = y;
    this.handle2.setPosition(x, y);

    this.normalizedControlPoint2X = inverseLerp(
      this.startPointX,
      this.endPointX,
      x
    );
    this.normalizedControlPoint2Y = inverseLerp(
      this.startPointY,
      this.endPointY,
      y
    );
  }

  updateRect() {
    this.rect = this.canvas.getBoundingClientRect();
    this.canvas.width = this.rect.width;
    this.canvas.height = this.rect.height;

    this.startPointY = this.rect.height - this.margin;
    this.endPointX = this.rect.width - this.margin;
    this.controlPoint1X = lerp(
      this.startPointX,
      this.endPointX,
      this.normalizedControlPoint1X
    );
    this.controlPoint1Y = lerp(
      this.startPointY,
      this.endPointY,
      this.normalizedControlPoint1Y
    );
    this.controlPoint2X = lerp(
      this.startPointX,
      this.endPointX,
      this.normalizedControlPoint2X
    );
    this.controlPoint2Y = lerp(
      this.startPointY,
      this.endPointY,
      this.normalizedControlPoint2Y
    );

    this.handle1.updatePoints(
      this.startPointX,
      this.startPointY,
      this.controlPoint1X,
      this.controlPoint1Y
    );
    this.handle2.updatePoints(
      this.endPointX,
      this.endPointY,
      this.controlPoint2X,
      this.controlPoint2Y
    );

    this.draw();
  }

  clampPosition(x, y) {
    return [
      clamp(x - this.rect.left, this.margin, this.rect.width - this.margin),
      clamp(y - this.rect.top, this.margin, this.rect.height - this.margin),
    ];
  }

  draw() {
    this.ctx.clearRect(0, 0, this.rect.width, this.rect.height);
    this.drawBackground();
    this.drawCurve();
    this.drawSamples();
    this.handle2.draw();
    this.handle1.draw();
  }

  drawBackground() {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(
      this.margin,
      this.margin,
      this.rect.width - 2 * this.margin,
      this.rect.height - 2 * this.margin
    );

    const cells = 10;
    const cellSize = (this.rect.width - this.margin * 2) / cells;
    this.ctx.strokeStyle = this.gridColor;
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= cells; i++) {
      this.ctx.moveTo(this.margin + cellSize * i, this.margin);
      this.ctx.lineTo(
        this.margin + cellSize * i,
        this.rect.height - this.margin
      );
      this.ctx.moveTo(this.margin, this.margin + cellSize * i);
      this.ctx.lineTo(
        this.rect.width - this.margin,
        this.margin + cellSize * i
      );
    }
    this.ctx.stroke();
  }

  drawCurve() {
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.curveColor;
    this.ctx.lineWidth = 5;
    this.ctx.moveTo(this.startPointX, this.startPointY);
    this.ctx.bezierCurveTo(
      this.controlPoint1X,
      this.controlPoint1Y,
      this.controlPoint2X,
      this.controlPoint2Y,
      this.endPointX,
      this.endPointY
    );
    this.ctx.stroke();
  }

  drawSamples() {
    const n = this.samples.length;
    for (let i = 0; i < n; i++) {
      const x = lerp(this.startPointX, this.endPointX, i / (n - 1));
      const y = lerp(this.startPointY, this.endPointY, this.samples[i]);
      this.drawSample(x, y);
    }
  }

  drawSample(x, y) {
    this.ctx.fillStyle = this.pointColor;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 2, 0, Math.PI * 2);
    this.ctx.fill();
  }
}

class HandlePlot {
  constructor(ctx, startX, startY, x, y) {
    this.ctx = ctx;
    this.startX = startX;
    this.startY = startY;
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.outline = 6;

    this.handleColor = "#A5A6F6";
    this.thumbColor = "#5D5FEF";
    this.outlineColor = "rgba(165, 166, 246, 0.5)";

    this.isDragging = false;
    this.highlight = false;
  }

  updatePoints(startX, startY, x, y) {
    this.startX = startX;
    this.startY = startY;

    this.setPosition(x, y);
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;

    this.draw();
  }

  collision(x, y) {
    const xMin = this.x - this.radius;
    const xMax = this.x + this.radius;
    const yMin = this.y - this.radius;
    const yMax = this.y + this.radius;
    return xMin <= x && x <= xMax && yMin <= y && y <= yMax;
  }

  draw() {
    this.ctx.fillStyle = this.handleColor;
    this.ctx.beginPath();
    this.ctx.arc(this.startX, this.startY, 5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = this.handleColor;
    this.ctx.lineWidth = 5;
    this.ctx.strokeStyle = this.handleColor;
    this.ctx.beginPath();
    this.ctx.moveTo(this.startX, this.startY);
    this.ctx.lineTo(this.x, this.y);
    this.ctx.stroke();
    if (this.highlight) {
      this.ctx.fillStyle = this.outlineColor;
      this.ctx.beginPath();
      this.ctx.arc(this.x, this.y, this.radius + this.outline, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.fillStyle = this.thumbColor;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
