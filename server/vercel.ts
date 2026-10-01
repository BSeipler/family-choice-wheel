import app from './app.ts'

export default {
  fetch(request: Request) {
    return app.fetch(request)
  },
}
