var degrees = 0;
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let scale = 1;
let imgScale = 1;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.2;

let isDragging = false;
let startX = 0, startY = 0;
let translateX = 0, translateY = 0;

//////////// PDF View Helper js ///////////////
import * as pdfjsLib from "../file-viewer/pdfjs/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "/lib/file-viewer/pdfjs/pdf.worker.mjs";
//////////////////////////////////////////////////////


////// Add viewer object to the html body and intialize elements ///////
$('body').append(getPreviewBody());

const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");

const img = document.getElementById("imageViewer");
const zoomLabelImg = document.getElementById("zoomLevelImg");
///////////////////////////////////////////////////////////

///// Handle preview file operation //////////
$('body').on('click', '.preview-file', function (e) {
    e.preventDefault();

    var url = $(this).attr('href');

    openFile(url);
    setDownloadLink(url);
});
function openFile(url) {
    $.ajax({
        url: url,
        success: function (blob, status, xhr) {

            // Get File Metadata
            const fileName = xhr.getResponseHeader('X-File-Name');
            const fileSize = xhr.getResponseHeader('X-File-Size');
            const fileType = xhr.getResponseHeader('X-File-Type');

            //console.log(fileName, fileSize, fileType);
            $('#previewFilename').text(fileName);

            if (fileType === 'application/pdf') {
                openPreview(url, "pdf");
            } else {
                openPreview(url, "image");
            }
        },
        error: function (xhr) {
            // This is triggered by non-200 HTTP status codes
            switch (xhr.status) {
                
                case 404:
                    alert('Error (404): ' + JSON.parse(xhr.responseText).message);
                    break;
                case 400:
                    alert('Error (400): ' + JSON.parse(xhr.responseText).message);
                    break;
                case 401:
                    window.location = "/Account/Login"; // Redirect to login page
                    break;
                case 500:
                    alert('Error (500): An internal server error occurred. Please try again later. Error - ' + JSON.parse(xhr.responseText).message);
                    break;
            }
        }
    });
}
function setDownloadLink(url) {
    $('#previewDownload').attr('href', url + '&download=true');
}
function openPreview(url, type) {
    $('#docOverlay').css('display', 'flex');

    if (type === "pdf") {
        $('#pdfViewer').removeClass('hidden');
        $('#imageViewer').addClass('hidden');
        $('.pdf-toolbar').removeClass('hidden');
        $('.image-toolbar').addClass('hidden');
        openPdf(url);
    } else {
        $('#imageViewer').attr('src', url).removeClass('hidden');
        resetImage();
        $('#pdfViewer').addClass('hidden');
        $('.pdf-toolbar').addClass('hidden');
        $('.image-toolbar').removeClass('hidden');
    }
}

window.closePreview = function () {
    $('#docOverlay').css('display', 'none');
    $('#imageViewer').attr('src', '');
    $('#imageViewer').css({
        'transform': 'rotate(0deg)',
        '-ms-transform': 'rotate(0deg)',
        '-moz-transform': 'rotate(0deg)',
        '-webkit-transform': 'rotate(0deg)',
        '-o-transform': 'rotate(0deg)'
    });
    $('#previewDownload').attr('href', '#');

    degrees = 0;
    pdfDoc = null;
    currentPage = 1;
    totalPages = 0;
    scale = 1;
    imgScale = 1;
};

//// PDF Operations /////////
window.openPdf = async function (url) {

    pdfDoc = await pdfjsLib.getDocument(url).promise;
    totalPages = pdfDoc.numPages;
    currentPage = 1;

    renderPage();
};
async function renderPage() {
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
        canvasContext: ctx,
        viewport: viewport
    }).promise;

    updateToolbar();
}
window.nextPage = function () {
    if (currentPage < totalPages) {
        currentPage++;
        renderPage();
    }
};

window.prevPage = function () {
    if (currentPage > 1) {
        currentPage--;
        renderPage();
    }
};
window.zoomIn = () => {
    if (scale < MAX_ZOOM) {
        scale += ZOOM_STEP;
        renderPage();
    }
};

window.zoomOut = () => {
    if (scale > MIN_ZOOM) {
        scale -= ZOOM_STEP;
        renderPage();
    }
};
// Keyboard shortcuts (Gmail-like)
document.addEventListener("keydown", e => {
    if (!pdfDoc) return;

    if (e.ctrlKey && e.key === "+") zoomIn();
    if (e.ctrlKey && e.key === "-") zoomOut();
    if (e.key === "ArrowRight") nextPage();
    if (e.key === "ArrowLeft") prevPage();
    if (e.key === "Escape") closePdf();
});
function updateToolbar() {
    document.getElementById("pageInfo").innerText =
        `Page ${currentPage} / ${totalPages}`;

    if (currentPage === 1) {
        $('.pdf-toolbar a:nth-child(1)').addClass('disabled').children('svg').attr('stroke', '#555');
    } else {
        $('.pdf-toolbar a:nth-child(1)').removeClass('disabled').children('svg').attr('stroke', '#ffffff');
    }
    if (currentPage === totalPages) {
        $('.pdf-toolbar a:nth-child(3)').addClass('disabled').children('svg').attr('stroke', '#555');
    } else {
        $('.pdf-toolbar a:nth-child(3)').removeClass('disabled').children('svg').attr('stroke', '#ffffff');
    }

    document.getElementById("zoomLevel").innerText =
        `${Math.round(scale * 100)}%`;
}


//// Image operations ////
window.rotateImage = function (rotate_degree) {
    degrees += rotate_degree;
    $('#imageViewer').css({
        'transform': 'rotate(' + degrees + 'deg) translate(' + translateX + 'px, ' + translateY + 'px) scale(' + imgScale + ')',
        '-ms-transform': 'rotate(' + degrees + 'deg) translate(' + translateX + 'px, ' + translateY + 'px) scale(' + imgScale + ')',
        '-moz-transform': 'rotate(' + degrees + 'deg) translate(' + translateX + 'px, ' + translateY + 'px) scale(' + imgScale + ')',
        '-webkit-transform': 'rotate(' + degrees + 'deg) translate(' + translateX + 'px, ' + translateY + 'px) scale(' + imgScale + ')',
        '-o-transform': 'rotate(' + degrees + 'deg) translate(' + translateX + 'px, ' + translateY + 'px) scale(' + imgScale + ')'
    });
};
function resetImage() {
    imgScale = 1;
    translateX = 0;
    translateY = 0;
    applyImageTransform();
}
function applyImageTransform() {
    img.style.transform =
        `translate(${translateX}px, ${translateY}px) scale(${imgScale}) rotate(${degrees}deg)`;
    zoomLabelImg.innerText = `${Math.round(imgScale * 100)}%`;
}
window.zoomInImg = function () {
    if (imgScale < MAX_ZOOM) {
        imgScale += ZOOM_STEP;
        applyImageTransform();
    }
}

window.zoomOutImg = function () {
    if (imgScale > MIN_ZOOM) {
        imgScale -= ZOOM_STEP;
        applyImageTransform();
    }
}
/* Drag to Pan */
img.addEventListener("mousedown", e => {
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    img.style.cursor = "grabbing";
});

window.addEventListener("mousemove", e => {
    if (!isDragging) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    applyImageTransform();
});

window.addEventListener("mouseup", () => {
    isDragging = false;
    img.style.cursor = "grab";
});

/* Mouse Wheel Zoom */
document.getElementById("imageViewer").addEventListener("wheel", e => {
    e.preventDefault();
    e.deltaY < 0 ? zoomInImg() : zoomOutImg();
});


///// Preview body html /////
function getPreviewBody() {
    return '<div id="docOverlay" class="overlay">' +
        '<div class="overlay-header">' +
        '<span id="previewFilename">Filename</span>' +
        '<div class="pdf-toolbar hidden">' +
        '<a href="javascript:void(0)" onclick="prevPage()"><svg fill="#ffffff" version="1.1" id="XMLID_54_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" xml:space="preserve" stroke="#ffffff" stroke-width="2.4"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g id="previous"> <g> <polygon points="17.2,23.7 5.4,12 17.2,0.3 18.5,1.7 8.4,12 18.5,22.3 "></polygon> </g> </g> </g></svg></a>' +
        '<span id="pageInfo">Page 1 / 1</span>' +
        '<a href="javascript:void(0)" onclick="nextPage()"><svg fill="#ffffff" version="1.1" id="XMLID_287_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" xml:space="preserve" stroke="#ffffff" stroke-width="2.4"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g id="next"> <g> <polygon points="6.8,23.7 5.4,22.3 15.7,12 5.4,1.7 6.8,0.3 18.5,12 "></polygon> </g> </g> </g></svg></a>' +
        '&nbsp;&nbsp;<a href="#" title="Zoom Out" onclick="zoomOut()"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" stroke-width="0.24000000000000005"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M5.5 10C5.5 9.44771 5.94772 9 6.5 9H13.5C14.0523 9 14.5 9.44771 14.5 10C14.5 10.5523 14.0523 11 13.5 11H6.5C5.94772 11 5.5 10.5523 5.5 10Z" fill="#ffffff"></path> <path fill-rule="evenodd" clip-rule="evenodd" d="M1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10C19 12.125 18.2635 14.078 17.0319 15.6177L21.7071 20.2929C22.0976 20.6834 22.0976 21.3166 21.7071 21.7071C21.3166 22.0976 20.6834 22.0976 20.2929 21.7071L15.6177 17.0319C14.078 18.2635 12.125 19 10 19C5.02944 19 1 14.9706 1 10ZM10 3C6.13401 3 3 6.13401 3 10C3 13.866 6.13401 17 10 17C13.866 17 17 13.866 17 10C17 6.13401 13.866 3 10 3Z" fill="#ffffff"></path> </g></svg></a>' +
        '<span id="zoomLevel">100%</span>' +
        '<a href="javascript:void(0)" title="Zoom In" onclick="zoomIn()"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M4 11C4 7.13401 7.13401 4 11 4C14.866 4 18 7.13401 18 11C18 14.866 14.866 18 11 18C7.13401 18 4 14.866 4 11ZM11 2C6.02944 2 2 6.02944 2 11C2 15.9706 6.02944 20 11 20C13.125 20 15.078 19.2635 16.6177 18.0319L20.2929 21.7071C20.6834 22.0976 21.3166 22.0976 21.7071 21.7071C22.0976 21.3166 22.0976 20.6834 21.7071 20.2929L18.0319 16.6177C19.2635 15.078 20 13.125 20 11C20 6.02944 15.9706 2 11 2Z" fill="#ffffff"></path> <path fill-rule="evenodd" clip-rule="evenodd" d="M10 14C10 14.5523 10.4477 15 11 15C11.5523 15 12 14.5523 12 14V12H14C14.5523 12 15 11.5523 15 11C15 10.4477 14.5523 10 14 10H12V8C12 7.44772 11.5523 7 11 7C10.4477 7 10 7.44772 10 8V10H8C7.44772 10 7 10.4477 7 11C7 11.5523 7.44772 12 8 12H10V14Z" fill="#ffffff"></path> </g></svg></a>' +
        '</div>' +
        '<div class="image-toolbar hidden">' +
        '<a href="javascript:void(0)" title="Rotate Left" onclick="rotateImage(-90)">' +
        '<svg viewBox="-0.5 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M10 10.55L6 14.55L2 10.55" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M8.34 18.0801C9.64796 19.3895 11.3695 20.2047 13.2112 20.3872C15.053 20.5697 16.901 20.1081 18.4405 19.0808C19.98 18.0535 21.1157 16.5242 21.654 14.7534C22.1924 12.9827 22.1002 11.0802 21.3931 9.36988C20.686 7.65953 19.4077 6.24713 17.7761 5.37354C16.1445 4.49996 14.2605 4.21912 12.445 4.57887C10.6295 4.93861 8.99496 5.91668 7.81976 7.34645C6.64457 8.77621 6.00146 10.5692 6 12.4199V14.1499" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>' +
        '</a>' +
        '<a href="javascript:void(0)" title="Rotate Right" onclick="rotateImage(90)">' +
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M11.5 20.5C6.80558 20.5 3 16.6944 3 12C3 7.30558 6.80558 3.5 11.5 3.5C16.1944 3.5 20 7.30558 20 12C20 13.5433 19.5887 14.9905 18.8698 16.238M22.5 15L18.8698 16.238M17.1747 12.3832L18.5289 16.3542L18.8698 16.238" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>' +
        '</a>' +
        '&nbsp;&nbsp;<a href="javascript:void(0)" title="Zoom out" onclick="zoomOutImg()"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" stroke-width="0.24000000000000005"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M5.5 10C5.5 9.44771 5.94772 9 6.5 9H13.5C14.0523 9 14.5 9.44771 14.5 10C14.5 10.5523 14.0523 11 13.5 11H6.5C5.94772 11 5.5 10.5523 5.5 10Z" fill="#ffffff"></path> <path fill-rule="evenodd" clip-rule="evenodd" d="M1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10C19 12.125 18.2635 14.078 17.0319 15.6177L21.7071 20.2929C22.0976 20.6834 22.0976 21.3166 21.7071 21.7071C21.3166 22.0976 20.6834 22.0976 20.2929 21.7071L15.6177 17.0319C14.078 18.2635 12.125 19 10 19C5.02944 19 1 14.9706 1 10ZM10 3C6.13401 3 3 6.13401 3 10C3 13.866 6.13401 17 10 17C13.866 17 17 13.866 17 10C17 6.13401 13.866 3 10 3Z" fill="#ffffff"></path> </g></svg></a>' +
        '<span id="zoomLevelImg">100%</span>' +
        '<a href="javascript:void(0)" onclick="zoomInImg()" title="Zoom In"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M4 11C4 7.13401 7.13401 4 11 4C14.866 4 18 7.13401 18 11C18 14.866 14.866 18 11 18C7.13401 18 4 14.866 4 11ZM11 2C6.02944 2 2 6.02944 2 11C2 15.9706 6.02944 20 11 20C13.125 20 15.078 19.2635 16.6177 18.0319L20.2929 21.7071C20.6834 22.0976 21.3166 22.0976 21.7071 21.7071C22.0976 21.3166 22.0976 20.6834 21.7071 20.2929L18.0319 16.6177C19.2635 15.078 20 13.125 20 11C20 6.02944 15.9706 2 11 2Z" fill="#ffffff"></path> <path fill-rule="evenodd" clip-rule="evenodd" d="M10 14C10 14.5523 10.4477 15 11 15C11.5523 15 12 14.5523 12 14V12H14C14.5523 12 15 11.5523 15 11C15 10.4477 14.5523 10 14 10H12V8C12 7.44772 11.5523 7 11 7C10.4477 7 10 7.44772 10 8V10H8C7.44772 10 7 10.4477 7 11C7 11.5523 7.44772 12 8 12H10V14Z" fill="#ffffff"></path> </g></svg></a>' +
        '</div>' +
        '<div>' +
        '<a href="javascript:void(0)" title="Download" target="_blank" id="previewDownload">' +
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M12 3V16M12 16L16 11.625M12 16L8 11.625" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M15 21H9C6.17157 21 4.75736 21 3.87868 20.1213C3 19.2426 3 17.8284 3 15M21 15C21 17.8284 21 19.2426 20.1213 20.1213C19.8215 20.4211 19.4594 20.6186 19 20.7487" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>' +
        '</a>' +
        '<a href="javascript:void(0)" onclick="closePreview()" title="Close">' +
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g id="Menu / Close_MD"> <path id="Vector" d="M18 18L12 12M12 12L6 6M12 12L18 6M12 12L6 18" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path> </g> </g></svg>' +
        '</a>' +
        '</div>' +
        '</div >' +
        '<div class="overlay-content">' +
        '<div id="pdfViewer" class="pdf-viewer"><canvas id="pdfCanvas"></canvas></div>' +
        '<img id="imageViewer" class="img-fluid hidden" />' +
        '</div>' +
        '</div>' +
        '</div >';
}