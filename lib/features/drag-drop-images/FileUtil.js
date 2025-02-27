export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    try {
      var reader = new FileReader();
      reader.onloadend = function() {
        resolve(reader.result);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      reject(e);
    }
  });
}

export async function imageProcessor(ev, file) {
  const base64file = await fileToDataURL(file);
  return base64file; // passing any errors through
}

export async function fileReader(ev, files) {
  let uploadResult = [];
  let errors;
  let fileItems = files;
  if (ev && (ev.dataTransfer.items || ev.dataTransfer.files)) {
    fileItems = ev.dataTransfer.items || ev.dataTransfer.files;
  }
  try {
    if (fileItems) {
      for (var i = 0; i < fileItems.length; i++) {
        if (ev && ev.dataTransfer.items) {
          if (fileItems[i].kind === 'file') {
            var file = fileItems[i].getAsFile();
            uploadResult.push(file);
          }
        } else {
          uploadResult.push(fileItems[i]);
        }
      }
    }
  } catch (e) {
    errors = e;
    uploadResult = null;
  }
  const file_results = uploadResult;
  const image_results = [];
  var j = 0;
  while (j < uploadResult.length) {
    // Required by DirectUploads
    file_results[j].filename = file_results[j].name;

    const fileImg = await imageProcessor(ev, uploadResult[j]);
    image_results.push(fileImg);
    j+=1;
  }
  return { file_results, image_results, errors };
}

