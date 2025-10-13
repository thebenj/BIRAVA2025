//const app = express();
const portNext = 3000;
//const request = require("request");

var runServerSetUp = (app, cors, https) => {


    app.use(cors({
        origin: "*"
    }))

    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    app.get('/:dis', (req, res) => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        let newEndpoint = process.env.API_BASE_URL + "/" + req.params.dis + "?";
        let qVals = Object.entries(req.query);
        let resEP = Object.entries(req.query).reduce((cum, ite, ine, ina) =>
            cum += ite[0] + "=" + ite[1] + (((ine < ina.length - 1) && (ina.length > 1)) ? "," : "")
            , newEndpoint)
        //    console.log("here!!" + resEP);
        let params = {};
        if (!!process.env.API_KEY_PARAM_NAME && !!process.env.API_KEY) {
            params[process.env.API_KEY_PARAM_NAME] = process.env.API_KEY;
        }
        axios({ method: 'get', url: resEP, params: params, headers: { 'content-type': 'text/html' }, httpsAgent: agent }).then(response => {
            //res.download("/ressie.html");
            res.send(response.data);
        }).catch(error => {
            res.json(error);
        })
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

    })

    app.listen(portNext, '127.0.0.99', function () {
        console.log(`Example app listening on port ${portNext}!`)
    });

}
