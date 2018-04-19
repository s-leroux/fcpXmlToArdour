const express = require('express')
const upload = require('multer')(); // XXX should limit mx upload size

const app = express()

const processor = require("./lib/processor");

const PORT = process.env.PORT || 8080;

app.post('/', upload.single('xml'), processor)

module.exports = app.listen(PORT, () => console.log(`App listening on port ${PORT}`));
