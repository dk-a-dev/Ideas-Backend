import express, { Express } from 'express'
import morgan from 'morgan'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import router from './routes/index'
import rateLimit from 'express-rate-limit'

const app: Express = express()

app.use(helmet())
app.disable('x-powered-by')

if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false // Disable the `X-RateLimit-*` headers
  })
  app.use(limiter)
}

// app.use(cors({
//   origin: 'http://127.0.0.1:3000',
//   methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//   credentials: true
// }))

app.use(cors())

app.use(express.json())

app.use(express.urlencoded({
  extended: true
}))

app.use(compression())

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

app.use('/', router)

export { app }
