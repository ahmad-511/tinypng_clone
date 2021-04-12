import Counter from "./Counter.js";
const counter = new Counter();

const initApp = () => {
    const droparea = document.querySelector('.droparea');

    const active = () => droparea.classList.add("green-border");

    const inactive = () => droparea.classList.remove("green-border");

    const prevents = (e) => e.preventDefault();

    ['dragover', 'drop'].forEach(evtName => {
        droparea.addEventListener(evtName, prevents);
    });

    ['dragenter', 'dragover'].forEach(evtName => {
        droparea.addEventListener(evtName, active);
    });

    ['dragleave', 'drop'].forEach(evtName => {
        droparea.addEventListener(evtName, inactive);
    });

    droparea.addEventListener("drop", handleDrop);

}

document.addEventListener("DOMContentLoaded", initApp);

const handleDrop = (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    const fileArray = [...files];
    if (fileArray.length > 20) return alert("Too many files!");
    handleFiles(fileArray);
}

const handleFiles = (fileArray) => {
    fileArray.forEach(file => {
        const fileID = counter.incrementValue();
        if (file.size > 4 * 1024 * 1024) return alert("File over 4 MB");
        createResult(file, fileID);
        uploadFile(file, fileID);
    });
}

const createResult = (file, fileID) => {
    const origFileSizeString = getFileSizeString(file.size);

    const p1 = document.createElement("p");
    p1.className = "results__title";
    p1.textContent = file.name;

    const p2 = document.createElement("p");
    p2.className = "results__size";
    p2.textContent = origFileSizeString;

    const divOne = document.createElement("div");
    divOne.appendChild(p1);
    divOne.appendChild(p2);

    const progress = document.createElement("progress");
    progress.id = `progress_${fileID}`;
    progress.className = "results__bar";
    progress.max = 1;
    progress.value = 0;

    const p3 = document.createElement("p");
    p3.id = `new_size_${fileID}`;
    p3.className = "results__size";

    const p4 = document.createElement("p");
    p4.id = `download_${fileID}`;
    p4.className = "results__download";

    const p5 = document.createElement("p");
    p5.id = `saved_${fileID}`;
    p5.className = "results__saved";

    const divDL = document.createElement("div");
    divDL.className = "divDL";
    divDL.appendChild(p4);
    divDL.appendChild(p5);

    const divTwo = document.createElement("div");
    divTwo.appendChild(p3);
    divTwo.appendChild(divDL);

    const li = document.createElement("li");
    li.appendChild(divOne);
    li.appendChild(progress);
    li.appendChild(divTwo);

    document.querySelector('.results__list').appendChild(li);
    displayResults();
}

const getFileSizeString = (filesize) => {
    const sizeInKB = parseFloat(filesize) / 1024;
    const sizeInMB = sizeInKB / 1024;
    return sizeInKB > 1024 ? `${sizeInMB.toFixed(1)} MB` : `${sizeInKB.toFixed(1)} KB`;
}

const displayResults = () => {
    const results = document.querySelector('.results');
    if (results.classList.contains('none')) {
        results.classList.remove('none');
        results.classList.add('block');
    }
}

const uploadFile = (file, fileID) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', async (e) => {
        const filename = file.name;
        const base64String = e.target.result;
        const extension = (filename).split('.').pop();
        const name = filename.slice(0, filename.length - (extension.length + 1));
        const body = { base64String, name, extension };
        const url = './.netlify/functions/compress_files';

        try {
            const xhr = new XMLHttpRequest();
            
            // Monitoring upload progress
            setupUploadMonitor(xhr, fileID);

            // Monitoring download progress
            setupDownloadMonitor(xhr, fileID);

            // Data received from server
            onResponse(xhr, (imgJson) => {
                populateResult(file, fileID, imgJson);
            });

            // Request the server
            sendRequest(xhr, url, body);

        } catch (err) {
            console.error(err);
        }
    });

    reader.readAsDataURL(file);
}

const setupUploadMonitor = (xhr, fileID) => {
    const progress = document.getElementById(`progress_${fileID}`);

    // File uploading
    xhr.upload.addEventListener('progress', e => {
        if(e.lengthComputable){
            updateProgressBar(fileID, 'Uploading', e.total, e.loaded);
        }
    });

    // File uploaded
    xhr.upload.addEventListener('loadend', e => {
        progress.classList.add('compressing');

        updateProgressLabel(fileID, 'Compressing');
    });
}

const setupDownloadMonitor = (xhr, fileID) => {
    const progress = document.getElementById(`progress_${fileID}`);

    // File downloading
    xhr.addEventListener('progress', e => {
        if(e.lengthComputable){
            updateProgressBar(fileID, 'Downloading', e.total, e.loaded);
        }

        if(progress.classList.contains('compressing')){
            progress.classList.remove('compressing');
        }
    });

    // File downloaded
    xhr.addEventListener('loadend', e => {
        progress.classList.add('finished');
        
        updateProgressLabel(fileID, 'Finished');
    });
}

const onResponse = (xhr, callback) => {
    xhr.addEventListener('readystatechange', function(){
        if (this.readyState === 4) {
            if (this.response.error) {
                console.log(this.response.error);

                return handleFileError(fileID);
            }

            callback(this.response);
        }
    });
}

const sendRequest = (xhr, url, body) => {
    xhr.open('POST', url);
    xhr.responseType = 'json';
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(body));
}

const handleFileError = (fileID) => {
    const progress = document.getElementById(`progress_${fileID}`);
    progress.value = progress.max;
    progress.classList.add('error');
}

const updateProgressBar = (fileID, label, total, loaded) => {
    const progress = document.getElementById(`progress_${fileID}`);
    progress.max = total;
    progress.value = loaded;

    updateProgressLabel(fileID, `${label} ${Math.floor(loaded * 100 / total)}%`);
}

const updateProgressLabel = (fileID, label) => {
    const progress = document.getElementById(`progress_${fileID}`);
    progress.dataset.label = label;
}

const populateResult = (file, fileID, imgJson) => {
    const newFileSizeString = getFileSizeString(imgJson.filesize);
    const percentSaved = getPercentSaved(file.size, imgJson.filesize);

    const newSize = document.getElementById(`new_size_${fileID}`);
    newSize.textContent = newFileSizeString;

    const download = document.getElementById(`download_${fileID}`);
    const link = createDownloadLink(imgJson);
    download.appendChild(link);

    const saved = document.getElementById(`saved_${fileID}`);
    saved.textContent = `−${Math.round(percentSaved)}%`;
}

const getPercentSaved = (origFileSize, newFileSize) => {
    const origFS = parseFloat(origFileSize);
    const newFS = parseFloat(newFileSize);
    return ((origFS - newFS) / origFS) * 100;
}

const createDownloadLink = (imgJson) => {
    const extension = (imgJson.filename).split('.').pop();
    const link = document.createElement('a');
    link.href = `data:image/${extension};base64,${imgJson.base64CompString}`;
    link.download = imgJson.filename;
    link.textContent = "download";
    return link;
}