import * as express from 'express'
import * as bodyParser from 'body-parser'
import './config';

const app = express()

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000

app.use(bodyParser.text({ type: '*/*' }))
app.use(express.static('public'))

app.get('/api/legado', require('./api/legado'))
app.post('/api/ra', require('./api/ra'))

app.get('/api/reader', require('./api/reader'))
app.get('/api/ireadnote', require('./api/ireadnote'))
app.get('/api/source_reader', require('./api/source_reader'))
app.get('/api/tts', require('./api/tts'))

app.listen(port, () => {
  console.debug(`DEBUG: ${globalThis.DEBUG}`);
  globalThis.DEBUG && console.info(`应用正在监听 ${port} 端口`)
})
