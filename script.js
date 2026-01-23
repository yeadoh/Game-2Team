const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const gameOverElement = document.getElementById('gameOver');
const restartBtn = document.getElementById('restartBtn');
const leaderboardList = document.getElementById('leaderboardList');
const statusElement = document.getElementById('status');

// Game variables
let score = 0;
let highScore = 0;
let gameSpeed = 3;
let gravity = 0.6;
let isGameOver = false;

// Dino
const dino = {
  x: 50,
  y: 150,
  width: 40,
  height: 50,
  dy: 0,
  jumpPower: -12,
  grounded: false,

  draw() {
    ctx.fillStyle = '#535353';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.x + 25, this.y + 10, 8, 8);
    ctx.fillRect(this.x + 5, this.y + this.height, 10, 5);
    ctx.fillRect(this.x + 25, this.y + this.height, 10, 5);
  },

  update() {
    this.dy += gravity;
    this.y += this.dy;

    if (this.y + this.height >= canvas.height - 10) {
      this.y = canvas.height - 10 - this.height;
      this.dy = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }
  },

  jump() {
    if (this.grounded && !isGameOver) {
      this.dy = this.jumpPower;
    }
  }
};

let obstacles = [];
let frameCount = 0;
let obstacleFrequency = 120;

class Obstacle {
  constructor() {
    this.width = 20;
    this.height = 40 + Math.random() * 20;
    this.x = canvas.width;
    this.y = canvas.height - 10 - this.height;
  }

  draw() {
    ctx.fillStyle = '#535353';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  update() {
    this.x -= gameSpeed;
  }
}

let clouds = [];

class Cloud {
  constructor() {
    this.x = canvas.width + Math.random() * 200;
    this.y = Math.random() * 50 + 20;
    this.width = 40 + Math.random() * 30;
    this.height = 20;
    this.speed = 0.5 + Math.random() * 0.5;
  }

  draw() {
    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.height / 2, 0, Math.PI * 2);
    ctx.arc(this.x + this.width / 3, this.y, this.height / 2 + 5, 0, Math.PI * 2);
    ctx.arc(this.x + this.width * 2 / 3, this.y, this.height / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  update() {
    this.x -= this.speed;
    if (this.x + this.width < 0) {
      this.x = canvas.width + Math.random() * 200;
    }
  }
}

for (let i = 0; i < 3; i++) {
  clouds.push(new Cloud());
}

function checkCollision(dinoObj, obstacle) {
  return (
    dinoObj.x < obstacle.x + obstacle.width &&
    dinoObj.x + dinoObj.width > obstacle.x &&
    dinoObj.y < obstacle.y + obstacle.height &&
    dinoObj.y + dinoObj.height > obstacle.y
  );
}

function drawGround() {
  ctx.strokeStyle = '#535353';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - 10);
  ctx.lineTo(canvas.width, canvas.height - 10);
  ctx.stroke();

  for (let i = 0; i < canvas.width; i += 20) {
    ctx.fillStyle = '#535353';
    ctx.fillRect(i + (frameCount % 20), canvas.height - 8, 10, 2);
  }
}

// API functions
async function saveScore(newScore) {
  try {
    statusElement.textContent = 'Saving score...';

    const response = await fetch('/api/scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ score: newScore })
    });

    if (response.ok) {
      statusElement.textContent = 'Score saved!';
      loadLeaderboard();
    } else {
      statusElement.textContent = 'Failed to save score';
    }
  } catch (error) {
    console.error('Error saving score:', error);
    statusElement.textContent = 'Error saving score';
  }
}

async function loadLeaderboard() {
  try {
    const response = await fetch('/api/scores');
    const scores = await response.json();

    if (scores.length === 0) {
      leaderboardList.innerHTML = '<div style="color: #888;">No scores yet</div>';
      return;
    }

    leaderboardList.innerHTML = scores
      .map(
        (item, index) => `
        <div class="leaderboard-item">
          <span>${index + 1}. Score: ${item.score}</span>
          <span style="font-size: 11px; color: #888;">
            ${new Date(item.timestamp).toLocaleDateString()}
          </span>
        </div>
      `
      )
      .join('');

    if (scores[0]) {
      highScore = scores[0].score;
      highScoreElement.textContent = highScore;
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    leaderboardList.innerHTML = '<div style="color: #888;">Failed to load</div>';
  }
}

function gameLoop() {
  if (isGameOver) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  clouds.forEach((cloud) => {
    cloud.update();
    cloud.draw();
  });

  drawGround();
  dino.update();
  dino.draw();

  frameCount++;
  if (frameCount % obstacleFrequency === 0) {
    obstacles.push(new Obstacle());
  }

  obstacles.forEach((obstacle, index) => {
    obstacle.update();
    obstacle.draw();

    if (checkCollision(dino, obstacle)) {
      isGameOver = true;
      gameOverElement.style.display = 'block';
      restartBtn.style.display = 'inline-block';

      if (score > 0) {
        saveScore(score);
      }
    }

    if (obstacle.x + obstacle.width < 0) {
      obstacles.splice(index, 1);
      score++;
      scoreElement.textContent = score;

      if (score % 10 === 0) {
        gameSpeed += 0.5;
        obstacleFrequency = Math.max(60, obstacleFrequency - 5);
      }
    }
  });

  requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    dino.jump();
  }
});

canvas.addEventListener('click', () => {
  dino.jump();
});

restartBtn.addEventListener('click', () => {
  score = 0;
  gameSpeed = 3;
  obstacleFrequency = 120;
  isGameOver = false;
  obstacles = [];
  frameCount = 0;
  dino.y = 150;
  dino.dy = 0;
  scoreElement.textContent = score;
  gameOverElement.style.display = 'none';
  restartBtn.style.display = 'none';
  statusElement.textContent = '';
  gameLoop();
});

// initial load
loadLeaderboard();
gameLoop();
