// scripts/generateApi.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const cheerio = require('cheerio');

const URL = "https://mumax.github.io/api.html";

function cleanSignature(signature) { // "Add( Quantity Quantity ) Quantity" --> "Add(Quantity, Quantity) Quantity"
    signature = signature.replace("( ", "(").replace(" )", ")")
    signature = signature.replaceAll(" ", ", ") // Add commas in between arguments
    signature = signature.replaceAll(",,", ",").replace("),", ")").replace(", {}", " {}"); // However, some spaces were actually meant to be spaces, so remove that comma again
    return signature
}

function codeListToStr(list) { // ["Add", "Min", "Max"] --> "`Add`, `Min` and `Max`"
    s = ""
    for (let [index, f] of list.entries()) {
        s += `\`${f}\``
        if (index < (list.length - 2)) {
            s += ", "
        } else if (index == (list.length - 2)) {
            s += " and "
        }
    }
    return s
}

https.get(URL, res => {
    let html = "";
    res.on("data", chunk => html += chunk);
    res.on("end", () => {
        const $ = cheerio.load(html);

        const output = {
            functions: {},
            variables: {},
            methods: {}
        };

        // Extract all API entries:
        $('#api-full').children('.api-entry').each((i, entry) => {
            const name = $(entry).find('.api-identifier').text().trim();
            let signature = $(entry).find('p').find('span').text().trim();
            let description = $(entry).children('.api-docstring').text().trim();

            // TODO: add return value to description if anything is returned

            const methods = [];
            const METHODSTRSTART = "  methods: \n\t\t\t "
            const METHODSTRSEP = "   "
            if (signature.includes(METHODSTRSTART)) {
                const methodstrings = signature.split(METHODSTRSTART)[1].split(METHODSTRSEP).map(cleanSignature);
                
                description += "\n\n### Methods\n"
                for (let methodstr of methodstrings) {
                    methodstr = cleanSignature(methodstr);
                    methods.push(methodstr);
                }
                description += codeListToStr(methodstrings) + "."
            }
            signature = signature.split(METHODSTRSTART)[0];
            signature = cleanSignature(signature);

            const obj = {signature, description, methods}
            if (signature.includes("(")) {
                output.functions[name] = obj;
            } else {
                output.variables[name] = obj;
            }
        });

        // Generate methods from the current population of functions and variables
        for (const [funcname, funcobj] of [].concat(Object.entries(output.functions), Object.entries(output.variables))) {
            for (const meth of funcobj.methods) {
                const methname = meth.split("(")[0];
                if (!Object.keys(output.methods).includes(methname)) {
                    output.methods[methname] = [{
                        "signature": meth,
                        "description": undefined,
                        "usedby": [funcname]
                    }]
                } else {
                    if (!output.methods[methname].map(x => x.signature).includes(meth)) {
                        output.methods[methname].push({
                            "signature": meth,
                            "description": undefined,
                            "usedby": [funcname]
                        })
                    } else {
                        output.methods[methname].find(x => (x.signature == meth)).usedby.push(funcname);
                    }
                    
                }
            }
        }

        // Generate method descriptions
        for (let methobj of Object.values(output.methods)) {
            for (let methobjunique of methobj) {
                if (methobjunique.description === undefined) {
                    methobjunique.usedby.sort((a, b) => a.localeCompare(b, 'en', {'sensitivity': 'base'}))
                    s = "A method of ";
                    s += codeListToStr(methobjunique.usedby);
                    s += "."
                    methobjunique.description = s
                }
            }
        }

        const outPath = path.join(__dirname, "..", "data", "mumax3_api.json");
        fs.writeFileSync(outPath, JSON.stringify(output, null, 4));
        console.log("Generated: " + outPath);
    });
});