const CLICK_EVENT = 'click';
const LOAD_EVENT = 'load';

const TRUE_TEXT = 'true';
const TABLE_ROW_TAG = 'tr';
const TABLE_DATA_TAG = 'td';
const IMAGE_MIME_TYPE_PATTERN = /^image\//;
const IMAGE_SYMBOL = '🎨';

const CANVAS_CONTEXT = '2d';
const CANVAS_TAG = 'canvas';
const DRAGGABLE_ATTRIBUTE = 'draggable';
const DATA_FILE = 'file';
const DATA_FILE_ATTRIBUTE = `data-${DATA_FILE}`;
const MODE_SELECTOR = 'input[name=mode]:checked';
const HORIZONTAL_MODE = 'horizontal';

const DRAG_DROP_EVENT = 'drop';
const DRAG_END_EVENT = 'dragend';
const DRAG_LEAVE_EVENT = 'dragleave';
const DRAG_OVER_CSS = 'drag-over';
const DRAG_OVER_EVENT = 'dragover';
const DRAG_START_EVENT = 'dragstart';

const TOUCH_START_EVENT = 'touchstart';
const TOUCH_MOVE_EVENT = 'touchmove';
const TOUCH_END_EVENT = 'touchend';

const fileDrop = document.getElementById('files');
const imagesList = document.getElementById('images-list');
const clearButton = document.getElementById('clear-button');
const stitchButton = document.getElementById('stitch-button');
const result = document.getElementById('result');
const keepAspectCheckbox = document.getElementById('keep-aspect');
const zoomSlider = document.getElementById('zoom-slider');
const zoomValue = document.getElementById('zoom-value');

let dragState = false;
let dragSource = null;

zoomSlider.addEventListener('input', () => {
    const zoomLevel = zoomSlider.value;
    zoomValue.textContent = `${zoomLevel}%`;
    const canvas = result.querySelector(CANVAS_TAG);
    canvas.style.width = `${canvas.width * zoomLevel / 100}px`;
    canvas.style.height = `${canvas.height * zoomLevel / 100}px`;
  });

const removeCanvas = () => {
    const canvas = result.querySelector(CANVAS_TAG);

    if(canvas) {
        result.removeChild(canvas);
    }
};

fileDrop.addEventListener(DRAG_DROP_EVENT, function (e) {
    e.preventDefault();
    dragState = false;
    fileDrop.classList.remove(DRAG_OVER_CSS);

    [...e.dataTransfer.files].forEach(function (file) {
        if (null === file.type.match(IMAGE_MIME_TYPE_PATTERN)) {
            const errorMessage = 'Invalid file type. Only image files are allowed.';
            console.error(errorMessage);
            const errorElement = document.createElement('p');
            errorElement.classList.add('error');
            errorElement.textContent = errorMessage;
            result.appendChild(errorElement);
            return;
        }

        const tr = document.createElement(TABLE_ROW_TAG);
        const td = document.createElement(TABLE_DATA_TAG);
        tr.setAttribute(DRAGGABLE_ATTRIBUTE, TRUE_TEXT);
        tr.setAttribute(DATA_FILE_ATTRIBUTE, URL.createObjectURL(file));
        td.appendChild(document.createTextNode(`${IMAGE_SYMBOL} ${file.name}`));
        tr.appendChild(td);

        tr.addEventListener(DRAG_OVER_EVENT, e => e.preventDefault());

        tr.addEventListener(DRAG_START_EVENT, () => {
            tr.classList.add(DRAG_OVER_CSS);
            clearButton.classList.add(DRAG_OVER_CSS);
            dragState = true;
            dragSource = tr;
        });

        tr.addEventListener(DRAG_END_EVENT, () => {
            tr.classList.remove(DRAG_OVER_CSS);
            clearButton.classList.remove(DRAG_OVER_CSS);
            dragState = false;
        });

        tr.addEventListener(DRAG_DROP_EVENT, () => {
            (dragSource.getBoundingClientRect().top > tr.getBoundingClientRect().top)
                ? tr.before(dragSource)
                : tr.after(dragSource);
            dragSource = null;
        });

        tr.addEventListener(TOUCH_START_EVENT, () => {
            tr.classList.add(DRAG_OVER_CSS);
            clearButton.classList.add(DRAG_OVER_CSS);
            dragState = true;
            dragSource = tr;
        });

        tr.addEventListener(TOUCH_END_EVENT, () => {
            tr.classList.remove(DRAG_OVER_CSS);
            clearButton.classList.remove(DRAG_OVER_CSS);
            dragState = false;
        });

        tr.addEventListener(TOUCH_MOVE_EVENT, (e) => {
            e.preventDefault();
            if (dragState) {
                const touch = e.touches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                if (element?.tagName === TABLE_ROW_TAG) {
                    (dragSource.getBoundingClientRect().top > element.getBoundingClientRect().top)
                        ? element.before(dragSource)
                        : element.after(dragSource);
                }
            }
        });

        imagesList.appendChild(tr);
    });
});

fileDrop.addEventListener(DRAG_LEAVE_EVENT, function (e) {
    e.preventDefault();
    fileDrop.classList.remove(DRAG_OVER_CSS);
});

fileDrop.addEventListener(DRAG_OVER_EVENT, function (e) {
    e.preventDefault();

    if (true === dragState) {
        return;
    }

    fileDrop.classList.add(DRAG_OVER_CSS);
});

clearButton.addEventListener(CLICK_EVENT, () => {
    while (imagesList.firstChild) {
        imagesList.removeChild(imagesList.firstChild);
    }

    removeCanvas();
    zoomSlider.value = 100;
    zoomValue.textContent = '100%';
    
});

clearButton.addEventListener(DRAG_OVER_EVENT, e => e.preventDefault());

clearButton.addEventListener(DRAG_DROP_EVENT, () => {
    clearButton.classList.remove(DRAG_OVER_CSS);

    if (null === dragSource) {
        return;
    }

    imagesList.removeChild(dragSource);
});

stitchButton.addEventListener(CLICK_EVENT, (e) => {
    zoomSlider.value = 100;
    zoomValue.textContent = '100%';

    e.preventDefault();
    removeCanvas();

    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    let sumX = 0;
    let sumY = 0;
    let loaded = 0;
    let bitmaps = [];

    const stitchImages = () => {
        const isHorizontalMode = document.querySelector(MODE_SELECTOR).value === HORIZONTAL_MODE;
        const canvas = document.createElement(CANVAS_TAG);
        canvas.width = isHorizontalMode ? sumX : maxX;
        canvas.style.maxWidth = isHorizontalMode ? '100%' : `${canvas.width}px`;
        canvas.height = isHorizontalMode ? maxY : sumY;
        canvas.style.maxHeight = isHorizontalMode ? `${canvas.height}px` : '50vh';

        const ctx = canvas.getContext(CANVAS_CONTEXT);
        let x = 0;
        let y = 0;

        if (keepAspectCheckbox.checked) {
            bitmaps.forEach(bitmap => {
                const width = isHorizontalMode ? bitmap.width : canvas.width;
                const height = isHorizontalMode ? canvas.height : bitmap.height;

                ctx.drawImage(bitmap, x, y, width, height);
                x += isHorizontalMode ? bitmap.width : 0;
                y += isHorizontalMode ? 0 : bitmap.height;
            });
        }

        bitmaps.forEach(bitmap => {
            let drawWidth = bitmap.width;
            let drawHeight = bitmap.height;
            ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, x, y, drawWidth, drawHeight);
            x += isHorizontalMode ? drawWidth : 0;
            y += isHorizontalMode ? 0 : drawHeight;
        });

        bitmaps = [];
        result.appendChild(canvas);
    };

    [...imagesList.children].forEach(tr => {
    fetch(tr.dataset[DATA_FILE])
        .then(response => response.blob())
        .then(blob => createImageBitmap(blob))
        .then(bitmap => {
        bitmaps.push(bitmap);
        minX = Math.min(minX, bitmap.width);
        maxX = Math.max(maxX, bitmap.width);
        minY = Math.min(minY, bitmap.height);
        maxY = Math.max(maxY, bitmap.height);
        sumX += bitmap.width;
        sumY += bitmap.height;

        if (++loaded === imagesList.children.length) {
            stitchImages();
        }
        })
        .catch(error => {
            const errorMessage = document.createElement('p');
            errorMessage.textContent = `Error loading image: ${tr.dataset[DATA_FILE]}`;
            document.body.appendChild(errorMessage);
        });
    });
});