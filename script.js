let canvas, rect, ctx, width, height;

let handle1, handle2, bezierCurve;

window.onload = () => {
  canvas = document.getElementById("canvas-bezier");
  rect = canvas.getBoundingClientRect();
  ctx = canvas.getContext("2d");
  width = canvas.width;
  height = canvas.height;

  handle1 = new Handle(margin, height - margin, "red");
  handle2 = new Handle(width - margin, margin, "blue");
  bezierCurve = new BezierCurve(
    ctx,
    margin,
    height - margin,
    width - margin,
    margin
  );

  canvas.onmousedown = (e) => {
    setMousePosition(e.x, e.y);

    handle2.isDragging = handle2.collision(mouse.x, mouse.y);
    if (!handle2.isDragging)
      handle1.isDragging = handle1.collision(mouse.x, mouse.y);

    handle1.setPosition(mouse.x, mouse.y);
    handle2.setPosition(mouse.x, mouse.y);

    draw();
  };

  draw();
};

window.addEventListener("resize", () => {
  rect = canvas.getBoundingClientRect();
});

const margin = 14;

function setMousePosition(x, y) {
  const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

  mouse.x = clamp(x - rect.left, margin, width - margin);
  mouse.y = clamp(y - rect.top, margin, height - margin);
}

function drawBackground() {
  ctx.fillStyle = "black";
  ctx.fillRect(margin, margin, width - 2 * margin, height - 2 * margin);

  const cells = 10;
  const cellWidth = (width - margin * 2) / cells;
  const cellHeight = (height - margin * 2) / cells;
  ctx.strokeStyle = "gray";
  ctx.lineWidth = 1;
  for (let i = 0; i <= cells; i++) {
    ctx.moveTo(margin + cellWidth * i, margin);
    ctx.lineTo(margin + cellWidth * i, height - margin);
    ctx.moveTo(margin, margin + cellHeight * i);
    ctx.lineTo(width - margin, margin + cellHeight * i);
  }
  ctx.stroke();
}

const mouse = {
  x: undefined,
  y: undefined,
};

class Handle {
  constructor(xFrom, yFrom, color) {
    this.xFrom = xFrom;
    this.yFrom = yFrom;
    this.x = xFrom;
    this.y = yFrom;
    this.color = color;
    this.radius = margin;
    this.isDragging = false;
  }

  setPosition(x, y) {
    if (this.isDragging) {
      this.x = x;
      this.y = y;
    }
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.arc(this.xFrom, this.yFrom, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(this.xFrom, this.yFrom);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
  }

  collision(x, y) {
    const xMin = this.x - this.radius;
    const xMax = this.x + this.radius;
    const yMin = this.y - this.radius;
    const yMax = this.y + this.radius;
    if (xMin <= x && x <= xMax && yMin <= y && y <= yMax) return true;
    return false;
  }
}

class BezierCurve {
  constructor(ctx, startX, startY, endX, endY) {
    this.ctx = ctx;
    this.startPoint = { x: startX, y: startY };
    this.endPoint = { x: endX, y: endY };
    this.controlPoint1 = { x: startX, y: startY };
    this.controlPoint2 = { x: endX, y: endY };
  }

  setControlPoint1(x, y) {
    this.controlPoint1.x = x;
    this.controlPoint1.y = y;
  }

  setControlPoint2(x, y) {
    this.controlPoint2.x = x;
    this.controlPoint2.y = y;
  }

  draw() {
    this.ctx.beginPath();
    this.ctx.strokeStyle = "yellow";
    this.ctx.lineWidth = 5;
    this.ctx.moveTo(this.startPoint.x, this.startPoint.y);
    this.ctx.bezierCurveTo(
      this.controlPoint1.x,
      this.controlPoint1.y,
      this.controlPoint2.x,
      this.controlPoint2.y,
      this.endPoint.x,
      this.endPoint.y
    );
    this.ctx.stroke();
  }

  evaluateY(t) {
    const value =
      Math.pow(1 - t, 3) * this.startPoint.y +
      3 * Math.pow(1 - t, 2) * t * this.controlPoint1.y +
      3 * (1 - t) * Math.pow(t, 2) * this.controlPoint2.y +
      Math.pow(t, 3) * this.endPoint.y;
    // return inverseLerp(this.startPoint.y, this.endPoint.y, value)
    return value;
  }

  evaluateX(t) {
    const value =
      Math.pow(1 - t, 3) * this.startPoint.x +
      3 * Math.pow(1 - t, 2) * t * this.controlPoint1.x +
      3 * (1 - t) * Math.pow(t, 2) * this.controlPoint2.x +
      Math.pow(t, 3) * this.endPoint.x;
    // return inverseLerp(this.startPoint.y, this.endPoint.y, value)
    return value;
  }

  findT(x) {
    const a = this.startPoint.x;
    const b = this.controlPoint1.x;
    const c = this.controlPoint2.x;
    const d = this.endPoint.x;

    const solutions = solveCubic(-a+3*b-3*c+d, 3*a-6*b+3*c, -3*a+3*b, a-x);
    for(let i = 0; i < solutions.length; i++) {
      if (0 <= solutions[i] && solutions[i] <= 1) return solutions[i];
    }
    return 0;
  }

  getEvaluation(min, max, steps) {
    let values = []
    for(let i = 0; i < steps; i++) {
      const x = lerp(this.startPoint.x, this.endPoint.x, i/(steps-1));
      const y = this.evaluateY(this.findT(x));
      drawPoint(x, y);
      const t = inverseLerp(this.startPoint.y, this.endPoint.y, y);
      const value = lerp(min, max, t);
      values.push(value);
    }
    console.log(values);
  }
}

function cuberoot(x) {
  var y = Math.pow(Math.abs(x), 1/3);
  return x < 0 ? -y : y;
}

function solveCubic(a, b, c, d) {
  if (Math.abs(a) < 1e-8) { // Quadratic case, ax^2+bx+c=0
      a = b; b = c; c = d;
      if (Math.abs(a) < 1e-8) { // Linear case, ax+b=0
          a = b; b = c;
          if (Math.abs(a) < 1e-8) // Degenerate case
              return [];
          return [-b/a];
      }

      var D = b*b - 4*a*c;
      if (Math.abs(D) < 1e-8)
          return [-b/(2*a)];
      else if (D > 0)
          return [(-b+Math.sqrt(D))/(2*a), (-b-Math.sqrt(D))/(2*a)];
      return [];
  }

  // Convert to depressed cubic t^3+pt+q = 0 (subst x = t - b/3a)
  var p = (3*a*c - b*b)/(3*a*a);
  var q = (2*b*b*b - 9*a*b*c + 27*a*a*d)/(27*a*a*a);
  var roots;

  if (Math.abs(p) < 1e-8) { // p = 0 -> t^3 = -q -> t = -q^1/3
      roots = [cuberoot(-q)];
  } else if (Math.abs(q) < 1e-8) { // q = 0 -> t^3 + pt = 0 -> t(t^2+p)=0
      roots = [0].concat(p < 0 ? [Math.sqrt(-p), -Math.sqrt(-p)] : []);
  } else {
      var D = q*q/4 + p*p*p/27;
      if (Math.abs(D) < 1e-8) {       // D = 0 -> two roots
          roots = [-1.5*q/p, 3*q/p];
      } else if (D > 0) {             // Only one real root
          var u = cuberoot(-q/2 - Math.sqrt(D));
          roots = [u - p/(3*u)];
      } else {                        // D < 0, three roots, but needs to use complex numbers/trigonometric solution
          var u = 2*Math.sqrt(-p/3);
          var t = Math.acos(3*q/p/u)/3;  // D < 0 implies p < 0 and acos argument in [-1..1]
          var k = 2*Math.PI/3;
          roots = [u*Math.cos(t), u*Math.cos(t-k), u*Math.cos(t-2*k)];
      }
  }

  // Convert back from depressed cubic
  for (var i = 0; i < roots.length; i++)
      roots[i] -= b/(3*a);

  return roots;
}

function lerp(min, max, t) {
  return min + (max-min)*t;
}

function inverseLerp(min, max, value) {
  return (value - min) / (max-min);
}

function drawPoint(x, y) {
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  drawBackground();
  bezierCurve.draw();
  handle1.draw();
  handle2.draw();
  bezierCurve.getEvaluation(0, 100, 101);
}

document.onmousemove = (e) => {
  if (handle1.isDragging || handle2.isDragging) {
    setMousePosition(e.x, e.y);

    handle1.setPosition(mouse.x, mouse.y);
    handle2.setPosition(mouse.x, mouse.y);
    bezierCurve.setControlPoint1(handle1.x, handle1.y);
    bezierCurve.setControlPoint2(handle2.x, handle2.y);

    draw();
  }
};

document.onmouseup = (e) => {
  handle1.isDragging = false;
  handle2.isDragging = false;
};
