const grid: number[][] = [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
];

const gridWidth = grid[0].length;
const gridHeight = grid.length;

const cameraCanvas = document.querySelector("#camera") as HTMLCanvasElement;
cameraCanvas.width = 640;
cameraCanvas.height = 320;
const cameraContext = cameraCanvas.getContext("2d") as CanvasRenderingContext2D;

const mapCanvas = document.querySelector("#map") as HTMLCanvasElement;
mapCanvas.width = (cameraCanvas.height / gridHeight) * gridWidth;
mapCanvas.height = cameraCanvas.height;
const mapContext = mapCanvas.getContext("2d") as CanvasRenderingContext2D;

let cameraX = gridWidth / 2;
let cameraY = gridHeight / 2;
let cameraAngle = 0;
const cameraFov = Math.PI / 3;
const rayAngleIncrement = (cameraFov / cameraCanvas.width);

let leftKeyDown = false;
let upKeyDown = false;
let rightKeyDown = false;
let downKeyDown = false;

document.addEventListener("keydown", (event) => {
    if (event.keyCode === 37) {
        leftKeyDown = true;
    } else if (event.keyCode === 38) {
        upKeyDown = true;
    } else if (event.keyCode === 39) {
        rightKeyDown = true;
    } else if (event.keyCode === 40) {
        downKeyDown = true;
    }
});

document.addEventListener("keyup", (event) => {
    if (event.keyCode === 37) {
        leftKeyDown = false;
    } else if (event.keyCode === 38) {
        upKeyDown = false;
    } else if (event.keyCode === 39) {
        rightKeyDown = false;
    } else if (event.keyCode === 40) {
        downKeyDown = false;
    }
});

/**
 * Returns an equivalent angle between 0 and 2pi radians.
 * @param x An angle in radians.
 */
function normalizeAngle(angle: number): number {
    if (angle < 0) {
        return angle + (Math.PI * 2);
    } else if (angle >= Math.PI * 2) {
        return angle - (Math.PI * 2);
    } else {
        return angle;
    }
}

/**
 * Returns the distance from the origin of the ray to the first wall that the
 * ray hits, or `Infinity` if the ray never hits a wall.
 * @param startX The x value of the point from which the ray is cast.
 * @param startY The y value of the point from which the ray is cast.
 * @param rayAngle The angle in radians at which the ray is cast.
 */
function castRay(startX: number, startY: number, rayAngle: number): number {
        const isRayFacingUp = rayAngle > Math.PI;
        const isRayFacingLeft = rayAngle > Math.PI / 2 && rayAngle < (Math.PI * 1.5);

        // horizontal intersections
        let horizontalIntersectionX;
        let horizontalIntersectionY;
        let horizontalDeltaX;
        let horizontalDeltaY;
        if (isRayFacingUp) {
        horizontalIntersectionY = Math.floor(startY);
            horizontalDeltaX = -1 / Math.tan(rayAngle);
            horizontalDeltaY = -1;
        } else {
        horizontalIntersectionY = Math.floor(startY) + 1;
            horizontalDeltaX = 1 / Math.tan(rayAngle);
            horizontalDeltaY = 1;
        }
    horizontalIntersectionX = startX + ((startY - horizontalIntersectionY) / -Math.tan(rayAngle));

        // vertical intersections
        let verticalIntersectionX;
        let verticalIntersectionY;
        let verticalDeltaX;
        let verticalDeltaY;
        if (isRayFacingLeft) {
        verticalIntersectionX = Math.floor(startX);
            verticalDeltaX = -1;
            verticalDeltaY = -1 * Math.tan(rayAngle);
        } else {
        verticalIntersectionX = Math.floor(startX) + 1;
            verticalDeltaX = 1;
            verticalDeltaY = 1 * Math.tan(rayAngle);
        }
    verticalIntersectionY = startY + ((startX - verticalIntersectionX) * -Math.tan(rayAngle));

        let hitWallHorizontally = false;
        while (true) {
            const horizontalFlooredX = Math.floor(horizontalIntersectionX);
            const horizontalFlooredY = Math.floor(horizontalIntersectionY + (isRayFacingUp ? -0.01 : 0));
            if (horizontalFlooredX >= 0 &&
                horizontalFlooredX < gridWidth &&
                horizontalFlooredY >= 0 &&
                horizontalFlooredY < gridHeight) {
                if (grid[horizontalFlooredY][horizontalFlooredX] > 0) {
                    hitWallHorizontally = true;
                    break;
                }
                horizontalIntersectionX += horizontalDeltaX;
                horizontalIntersectionY += horizontalDeltaY;
            } else {
                break;
            }
        }

        let hitWallVertically = false;
        while (true) {
            const verticalFlooredX = Math.floor(verticalIntersectionX + (isRayFacingLeft ? -0.01 : 0));
            const verticalFlooredY = Math.floor(verticalIntersectionY);
            if (verticalFlooredX >= 0 &&
                verticalFlooredX < gridWidth &&
                verticalFlooredY >= 0 &&
                verticalFlooredY < gridHeight) {
                if (grid[verticalFlooredY][verticalFlooredX] > 0) {
                    hitWallVertically = true;
                    break;
                }
                verticalIntersectionX += verticalDeltaX;
                verticalIntersectionY += verticalDeltaY;
            } else {
                break;
            }
        }

        let horizontalWallDistance = Infinity;
        if (hitWallHorizontally) {
            horizontalWallDistance = Math.sqrt(
            Math.pow(horizontalIntersectionX - startX, 2) + Math.pow(horizontalIntersectionY - startY, 2),
            );
        }

        let verticalWallDistance = Infinity;
        if (hitWallVertically) {
            verticalWallDistance = Math.sqrt(
            Math.pow(verticalIntersectionX - startX, 2) + Math.pow(verticalIntersectionY - startY, 2),
            );
        }

    return Math.min(horizontalWallDistance, verticalWallDistance);
}

function renderLoop(): void {
    cameraContext.fillStyle = "black";
    cameraContext.fillRect(0, 0, cameraCanvas.width, cameraCanvas.height);

    let rayAngle = cameraAngle - (cameraFov / 2);
    for (let slice = 0; slice <= cameraCanvas.width; slice++) {
        rayAngle = normalizeAngle(rayAngle + rayAngleIncrement);
        const wallDistance = castRay(cameraX, cameraY, rayAngle);
        const offsetAngle = cameraAngle - rayAngle;
        const adjustedDistance = Math.cos(offsetAngle) * wallDistance;

        const wallHeight = (1 / adjustedDistance) * cameraCanvas.height;
        const color = (1 - (adjustedDistance / gridWidth)) * 192;
        cameraContext.fillStyle = `rgb(${color}, ${color}, ${color})`;
        cameraContext.fillRect(slice, (cameraCanvas.height - wallHeight) / 2, 1, wallHeight);
    }

    mapContext.fillStyle = "white";
    mapContext.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

    // draw grid lines
    mapContext.strokeStyle = "black";
    for (let x = 0; x <= gridWidth; x++) {
        const realX = Math.round(x * (mapCanvas.width / gridWidth));
        mapContext.moveTo(realX, 0);
        mapContext.lineTo(realX, mapCanvas.height);
        mapContext.stroke();
    }
    for (let y = 0; y <= gridHeight; y++) {
        const realY = Math.round(y * (mapCanvas.height / gridHeight));
        mapContext.moveTo(0, realY);
        mapContext.lineTo(mapCanvas.width, realY);
        mapContext.stroke();
    }

    // draw walls
    mapContext.fillStyle = "gray";
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            if (grid[y][x] === 0) {
                continue;
            }
            const startX = x * (mapCanvas.width / gridWidth) + 1;
            const startY = y * (mapCanvas.height / gridHeight) + 1;
            const rectWidth = (mapCanvas.width / gridWidth) - 2;
            const rectHeight = (mapCanvas.height / gridHeight) - 2;
            mapContext.fillRect(startX, startY, rectWidth, rectHeight);
        }
    }

    mapContext.fillStyle = "green";
    mapContext.beginPath();
    const circleX = cameraX * (mapCanvas.width / gridWidth);
    const circleY = cameraY * (mapCanvas.height / gridHeight);
    const radiusX = (mapCanvas.width / gridWidth) / 4;
    const radiusY = (mapCanvas.height / gridHeight) / 4;
    mapContext.ellipse(circleX, circleY, radiusX, radiusY, 0, 0, Math.PI * 2);
    mapContext.fill();

    mapContext.strokeStyle = "red";
    const leftAngle = cameraAngle + (cameraFov / 2);
    const leftTargetX = Math.cos(leftAngle) * Math.max(mapCanvas.width, mapCanvas.height) + circleX;
    const leftTargetY = Math.sin(leftAngle) * Math.max(mapCanvas.width, mapCanvas.height) + circleY;
    mapContext.beginPath();
    mapContext.moveTo(circleX, circleY);
    mapContext.lineTo(leftTargetX, leftTargetY);
    mapContext.stroke();
    const rightAngle = cameraAngle - (cameraFov / 2);
    const rightTargetX = Math.cos(rightAngle) * Math.max(mapCanvas.width, mapCanvas.height) + circleX;
    const rightTargetY = Math.sin(rightAngle) * Math.max(mapCanvas.width, mapCanvas.height) + circleY;
    mapContext.beginPath();
    mapContext.moveTo(circleX, circleY);
    mapContext.lineTo(rightTargetX, rightTargetY);
    mapContext.stroke();

    if (leftKeyDown) {
        cameraAngle -= Math.PI / 135;
        cameraAngle = normalizeAngle(cameraAngle);
    }
    if (upKeyDown) {
        cameraX += Math.cos(cameraAngle) / 16;
        cameraY += Math.sin(cameraAngle) / 16;
    }
    if (rightKeyDown) {
        cameraAngle += Math.PI / 135;
        cameraAngle = normalizeAngle(cameraAngle);
    }
    if (downKeyDown) {
        cameraX -= Math.cos(cameraAngle) / 16;
        cameraY -= Math.sin(cameraAngle) / 16;
    }

    requestAnimationFrame(renderLoop);
}

renderLoop();
