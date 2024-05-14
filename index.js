const express = require('express');
const { MongoClient, ServerApiVersion, MongoAWSError, ObjectId } = require('mongodb');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

//middleware
app.use(express.json())
app.use(cors())



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

        app.get("/all-assignment/:id", async (req, res) => {
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

        app.get("/submitted-assignment/:email", async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email }
            console.log(query);
            const result = await submittedAssignmentCollection.find(query).toArray();
            res.send(result)
        })

        app.get("/submitted-assignment", async(req, res) => {
            const query = {submissionStatus: 'Pending'}
            const result = await submittedAssignmentCollection.find(query).toArray();
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