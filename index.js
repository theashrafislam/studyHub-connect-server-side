const express = require('express');
const { MongoClient, ServerApiVersion, MongoAWSError, ObjectId } = require('mongodb');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

//middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://studyhub-connect-1f372.web.app',
        'https://studyhub-connect-1f372.firebaseapp.com'
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser())

//self middlewres
const logger = (req, res, next) => {
    console.log('log info: ', req.method, req.url);
    next();
}
const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    // console.log('token in the middleware', token);
    jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized access' })
        }
        req.user = decoded;
        next();
    })
}



console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gphdl2n.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const assignemntCollection = client.db('studyHub').collection('assignment')
        const submittedAssignmentCollection = client.db('studyHub').collection('submittedAssignment')

        //auth related api
        app.post("/jwt", logger, (req, res) => {
            const user = req.body;
            // console.log('user for token', user);
            const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '1h' });
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            }).send({ success: true })
        })

        app.post("/logout", async (req, res) => {
            const user = req.body;
            console.log('logout:', user);
            res.clearCookie('token', { 
                maxAge: 0, 
                httpOnly: true,
                secure: true,
                sameSite: 'none' }).send({ success: true })
        })

        //service related api
        app.post("/create-assignment", async (req, res) => {
            const assignemt = req.body;
            const result = await assignemntCollection.insertOne(assignemt);
            res.send(result)
        })

        app.get("/all-assignment", async (req, res) => {
            const result = await assignemntCollection.find().toArray();
            res.send(result)
        })

        app.delete("/all-assignment/:id", async (req, res) => {
            const id = req.params.id;
            const userEmail = req.body.userEmail;

            const query = { _id: new ObjectId(id) }
            const assignment = await assignemntCollection.findOne(query);
            console.log(assignment?.userEmail);

            if (!assignment) {
                return res.status(404).send({ error: "Assignment not found" });
            }
            else if (userEmail !== assignment.userEmail) {
                return res.status(403).send({ error: "Unauthorized: You do not have permission to delete this assignment" });
            }

            const result = await assignemntCollection.deleteOne(query);
            res.send(result)
        })

        app.get("/all-assignment/:id", verifyToken, async (req, res) => {
            if (req.query.email !== req.user.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await assignemntCollection.findOne(query);
            res.send(result)
        })
        app.put("/all-assignment/:id", async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    title: data.title,
                    marks: data.marks,
                    description: data.description,
                    image: data.image,
                    difficulty: data.difficulty,
                    date: data.date
                },
            };
            const result = await assignemntCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })

        app.post("/submitted-assignment", async (req, res) => {
            const { userEmail, id, pdfDocLink, additionalNotes, title, displayName } = req.body;
            const submissionStatus = "Pending";
            const submissionData = {
                userEmail,
                id,
                pdfDocLink,
                additionalNotes,
                submissionStatus,
                title,
                displayName
            };
            const result = await submittedAssignmentCollection.insertOne(submissionData)
            res.send(result)
        })

        app.get("/submitted-assignment/id/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            if (req.query.email !== req.user.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { _id: new ObjectId(id) };
            const result = await submittedAssignmentCollection.findOne(query);
            res.send(result);
        });

        app.get("/submitted-assignment/email/:email", verifyToken, async (req, res) => {
            if (req.query.email !== req.user.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const email = req.params.email;
            const query = { userEmail: email }
            const result = await submittedAssignmentCollection.find(query).toArray();
            res.send(result)
        })

        app.get("/submitted-assignment", verifyToken, async (req, res) => {
            if (req.query.email !== req.user.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { submissionStatus: 'Pending' }
            const result = await submittedAssignmentCollection.find(query).toArray();
            res.send(result)
        })

        app.put("/submitted-assignment/:id", async (req, res) => {
            const id = req.params.id;
            const addedData = req.body;
            const submissionStatus = "Completed";
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    mark: addedData.mark,
                    feedback: addedData.feedback,
                    submissionStatus: submissionStatus
                },
            };
            const result = await submittedAssignmentCollection.updateOne(query, updateDoc, options);
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hey, I am ok. Right now i am running.')
})

app.listen(port, () => {
    console.log(`I am running on port: ${port}`)
})