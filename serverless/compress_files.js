const imagemin = require("imagemin");
const imageminJpegRecompress = require("imagemin-jpeg-recompress");
const imageminPngquant = require("imagemin-pngquant");

exports.handler = async (event, context) => {
    const params = JSON.parse(event.body);
    const { base64String, name, extension } = params;
    const base64Image = base64String.split(';base64').pop();
    const filename = `${name}.${extension}`;

    try {
        const result = Buffer.from(base64Image, 'base64');
        const newImgBuffer = await imagemin.buffer(result, {
            destination: 'serverless/compress_files',
            plugins: [
                imageminJpegRecompress({
                    min: 20,
                    max: 60
                }),
                imageminPngquant({
                    quality: [0.2, 0.6]
                })
            ]
        });

        const filesize = newImgBuffer.length;
        const base64CompString = newImgBuffer.toString('base64');
        const imageDataObj = { base64CompString, filename, filesize };
        const content = JSON.stringify(imageDataObj);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': content.length,
            },
            body: content
        }
    } catch (err) {
        const content = JSON.stringify({ error: "File Error" });
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': content.length,
            },
            body: content
        }
    }
}