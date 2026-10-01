import app from '../server/app.ts'

export default {
  fetch(request: Request) {
    return app.fetch(request)
  },
}
