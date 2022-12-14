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

const fileDrop = document.getElementById('files');
const imagesList = document.getElementById('images-list');
const clearButton = document.getElementById('clear-button');
const stitchButton = document.getElementById('stitch-button');
const result = document.getElementById('result');
const keepAspectCheckbox = document.getElementById('keep-aspect');

let dragState = false;
let dragSource = null;

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
    removeCanvas();

    while (imagesList.children.length > 0) {
        imagesList.removeChild(imagesList.firstChild);
    }
});

clearButton.addEventListener(DRAG_OVER_EVENT, e => e.preventDefault());

clearButton.addEventListener(DRAG_DROP_EVENT, () => {
    clearButton.classList.remove(DRAG_OVER_CSS);

    if (null === dragSource) {
        return;
    }

    imagesList.removeChild(dragSource);
})

stitchButton.addEventListener(CLICK_EVENT, (e) => {
    e.preventDefault();
    removeCanvas();

    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    let sumX = 0;
    let sumY = 0;
    let loaded = 0;
    let images = [];

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
            images.forEach(image => {
                const width = isHorizontalMode ? image.width : canvas.width;
                const height = isHorizontalMode ? canvas.height : image.height;

                ctx.drawImage(image, x, y, width, height);
                x += isHorizontalMode ? image.width : 0;
                y += isHorizontalMode ? 0 : image.height;
            });
        }

        images.forEach(image => {
            let drawWidth = image.width;
            let drawHeight = image.height;
            ctx.drawImage(image, 0, 0, image.width, image.height, x, y, drawWidth, drawHeight);
            x += isHorizontalMode ? drawWidth : 0;
            y += isHorizontalMode ? 0 : drawHeight;
        });

        images = [];
        result.appendChild(canvas);
    };

    [...imagesList.children].forEach(tr => {
        const img = new Image();
        images.push(img);
        img.src = tr.dataset[DATA_FILE];
        img.addEventListener(LOAD_EVENT, () => {
            minX = Math.min(minX, img.width);
            maxX = Math.max(maxX, img.width);
            minY = Math.min(minY, img.height);
            maxY = Math.max(maxY, img.height);
            sumX += img.width;
            sumY += img.height;

            if (++loaded === imagesList.children.length) {
                stitchImages();
            }
        });
    });
});
