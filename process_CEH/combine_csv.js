//combines and cleans up the "presentados" and "ilustrativos" massacres, then structures
//the data by municipio for the circle packing functions

//dependencies
var csv = require("csv-parser");
var fs = require("fs");
var fastcsv = require("fast-csv");

//load municipios
var municipios = JSON.parse(fs.readFileSync("input/municipios_centroids.geojson"));

var combined_massacres = [];


//process casos presentados and add to combined
fs.createReadStream("input/casos_presentados.csv")
	.pipe(csv())
	.on("data", (row) => {

		//convert identified victims to array
		if(row.identificados) {
				row.identificados = row.identificados.split(",");
				row["identificados_count"] = row.identificados.length;
		} else {
			row["identificados_count"] = 0;
		}

		//get total victim count
		row["total_killed"] = +row["no_identificado"] + row["identificados_count"];

		//these rows have "unknown" for no_identificados. set as the greater of either 5 or the number of identified victims(CEH defines massacre as minimum of 5)
		if(isNaN(row["total_killed"])){
			row["total_killed"] = (5 > row["identificados_count"]) ? 5 : row["identificados_count"];
		}
		row = addDate(row);

		//if date is unknown(no year), row is excluded
		if(row["date"]) combined_massacres.push(row);
	})
	.on("end", () => {
		addIlustrativos();
	});

//add to combined
function addIlustrativos(){

	fs.createReadStream("input/casos_ilustrativos.csv")
	.pipe(csv())
	.on("data", (row) => {
		row = addDate(row);
		if(row.duplicate == "no" && row.date) combined_massacres.push(row);
	})
	.on("end", () => {
		console.log("There were " + combined_massacres.length + " massacres after those without dates were excluded.");
		structureMassacres(combined_massacres)
	});

}

//add massacre data to municipio data
function structureMassacres(massacres){
	console.log("Organizing massacres by municipio...")
	var totalMassacresAdded = 0;

	for(var municipio of municipios.features){
		var code = municipio.properties["codigo_mun"];

		var municipioMassacres = [];
		var municipioTotalKilled = 0;

		for(var massacre of massacres){

			var codigo = massacre["codigo_mun"];
			if(code == codigo){
				//could add filter here to remove guerrilla, focus only on state perpetrated
				municipioMassacres.push(massacre);
				totalMassacresAdded++;
				municipioTotalKilled+= Number(massacre["total_killed"]);
			}
		}
		//if there are massacress add to municipio as array in properties
		if(municipioMassacres.length>0){
			//sort in descending order for tight circle packing
			municipioMassacres.sort((a,b) => b["total_killed"] - a["total_killed"]);
			municipio.properties["massacres"] = municipioMassacres;
			municipio.properties["total_killed_municipio"] = municipioTotalKilled;
		}
	}
	console.log("There were " + totalMassacresAdded + " massacres after those without municipios were excluded.");
	writeFile(municipios);
}


function writeFile(data){
	fs.writeFileSync("output/massacres_nested.geojson", JSON.stringify(data));
}

var daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31]

function randomNumber(min,max){
	return Math.round(Math.random() * (max-min) + min);
}

function addDate(massacre) {

	if(massacre["day"]){
		var year = massacre["year"];
		var month = massacre["month"] -1;
		var day = massacre["day"];
		massacre["date"] = new Date(year, month, day);
	} else if(massacre["month"]) {
		var year = massacre["year"];
		var month = massacre["month"] -1;
		//assign random day
		var day = randomNumber(1,daysInMonth[month]);
		massacre["date"] = new Date(year, month, day);
	} else if(massacre["year"]){
		var year = massacre["year"]
		//assign random month
		var month = randomNumber(0,11)
		//assign random day
		var day = randomNumber(1,daysInMonth[month])
		massacre["date"] = new Date(year, month, day);
	} else {
		//unknown date
		massacre["date"] = ""
	}
	return massacre;
}
