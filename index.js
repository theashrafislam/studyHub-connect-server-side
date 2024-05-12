const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000;

//middleware
app.use(express())
app.use(cors())



app.get('/', (req, res) => {
    res.send('Hey, I am ok. Right now i am running.')
})

app.listen(port, () => {
    console.log(`I am running on port: ${port}`)
  })