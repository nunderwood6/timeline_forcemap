var svg;
var pathGuate;
var rScale;
var rasterBounds;
var focusWidth;
var circleGroups;
var outerCircles;
var massacresSpread;
var massacreSvg;

function loadData(){
    Promise.all([
      d3.json("data/municipios_topo.json"),
      d3.json("data/focusArea_extent.geojson"),
      d3.json("data/raster_extent.geojson"),
      d3.json("data/countries_topo.json"),
      d3.json("data/july/massacres_nested.geojson")])
    .then(function([municipiosTOPO,focusAreaJSON,rasterAreaJSON,countriesTOPO,massacresNestedJSON]){

        var municipios = topojson.feature(municipiosTOPO, municipiosTOPO.objects.municipios).features;
        var focusBox = focusAreaJSON;
        var rasterBox = rasterAreaJSON;
        var countries = topojson.feature(countriesTOPO, countriesTOPO.objects.countries).features;
        var massacres_nested = massacresNestedJSON;

        positionMap(municipios,focusBox,rasterBox,countries);
        calculateCirclePositions(massacres_nested);

    });
}

//creates full screen base map and lines up raster and vector layers
function positionMap(municipios,focusBox,rasterBox,countries){

    w = $("div.map").width();
    h = $("div.map").height();

    var margin = {top: 5, right: 5, bottom: 5, left: 5}

    //create guatemalaprojection
    const centerLocation = {
      "longitude": -90.2299,
      "latitude": 15.7779
    };
    //albers centered on guatemala
    const albersGuate = d3.geoConicEqualArea()
                      .parallels([14.8,16.8]) 
                      .rotate([centerLocation["longitude"]*-1,0,0])
                      .center([0,centerLocation["latitude"]])
                      .fitExtent([[margin.left,margin.top],[w-margin.right,h-margin.bottom]], focusBox);

    //path generator
    pathGuate = d3.geoPath()
             .projection(albersGuate);

    //store width of focus area to scale vectors
    var computedBox = pathGuate.bounds(focusBox)
    focusWidth = computedBox[1][0] - computedBox[0][0];

    svg = d3.select("div.map")
              .append("svg")
              .attr("class", "magic")
              .attr("viewBox", `0 0 ${w} ${h}`)
              .attr("overflow", "visible")
              .style("position","relative");


    //calculate raster extent percentages
    rasterBounds = pathGuate.bounds(rasterBox);
    var rasterWidth = (rasterBounds[1][0] - rasterBounds[0][0])/w*100;
    var rasterOrigin = [rasterBounds[0][0]/w*100,rasterBounds[0][1]/h*100];

    //append raster background
    svg.append("image")
            .attr("href", "img/dot_test_hs_background_brighter.jpg")
            .attr("x", rasterOrigin[0]+"%")
            .attr("y", rasterOrigin[1]+"%")
            .attr("width", rasterWidth + "%")
            .attr("transform", "translate(0,5)");

    //need to update the viewbox in main to match the calculations
    var viewBox = `0 0 ${w} ${h}`
    console.log("viewBox is " +viewBox);


}




function calculateCirclePositions(massacres_nested){
    //uses circle packing and force simulation to calculate positions for the circles for each time period.
    //stores in a format where each municipality has an array of circles w/ positions for each time period.

    var massacreData = {
                        "municipios": []
                        };

    //check if there are any massacres in this municipio, if not, discard
    var filtered = massacres_nested.features.filter(function(feature){
        if(feature.properties["massacres"]) return feature;
    });

    var daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31];

    rScale = d3.scaleSqrt()
                  .domain([0,400])
                  .range([0, focusWidth/55]);

    doCalculations();
    storeEfficiently();
    doSpreads();

    //check calculations
    //to download, simply copy in the console and paste into a json file
    console.log(massacreData);

    //loop through each time step
    function doCalculations(){
        for(var y = 1960; y <=1996; y++){
            for(var m = 0; m <= 11; m++){
                //current time step
                var t = new Date(y,m,daysInMonth[m],23,59);
                calculateCirclePacks(t,y,m);

            }
        }
    }

    function doSpreads(){
      for(var y = 1960; y <=1996; y++){
            for(var m = 0; m <= 11; m++){
                //adjust values with the spread simulation
                calculateSpreads(y,m);
            }
        }

    }

    function calculateCirclePacks(t,y,m){
        //loop through each municipio
        for(var municipio of filtered){
            //store current massacres
            municipio.properties["massacreSiblings_"+y+"_"+m] = [];
            //filter to just massacres for the current time
            for(var i=0; i<municipio.properties["massacres"].length; i++){
                //only add if in the current date range
                var current = municipio.properties["massacres"][i];
                if(Date.parse(current.date) < Date.parse(t)){
 
                  municipio.properties["massacreSiblings_"+y+"_"+m].push({
                    "r": round(rScale(+current["total_killed"]),7),
                    "caso": current.caso,
                    "caso_ilustrativo": current["caso ilustrativo"]
                  })
                }
            }
            municipio.properties["massacreSiblings_"+y+"_"+m] = d3.packSiblings(municipio.properties["massacreSiblings_"+y+"_"+m]);
            municipio.properties["massacreMama_"+y+"_"+m] = d3.packEnclose(municipio.properties["massacreSiblings_"+y+"_"+m]);
        }
    }

    function storeEfficiently(){
        for(var municipio of filtered){
            var munData = {
                "codigo_mun": municipio.properties["codigo_mun"],
                "mama": {}
            }
          //add data for each time slot if included
          for(var y = 1960; y <=1996; y++){
              for(var m = 0; m <= 11; m++){
                  if(municipio.properties["massacreSiblings_"+y+"_"+m].length > 0){
                    //add x,y,r for mama
                    munData.mama[y+"_"+m] = municipio.properties["massacreMama_"+y+"_"+m];
                    munData.mama[y+"_"+m].children = municipio.properties["massacreSiblings_"+y+"_"+m]

                    //round values for children
                    for(var child of munData.mama[y+"_"+m].children){
                        child.x = round(child.x,6);
                        child.y = round(child.y,6);
                    }

                  }
              }
          }
          massacreData["municipios"].push(munData);
        }

    }

   function calculateSpreads(y,m){

      var nodePadding = 0.05;
      const simulation = d3.forceSimulation(filtered)
      // .force("cx", d3.forceX().x(d => w / 2).strength(0.005))
      // .force("cy", d3.forceY().y(d => h / 2).strength(0.005))
      .force("x", d3.forceX().x(d => pathGuate.centroid(d) ? pathGuate.centroid(d)[0] : 0).strength(1))
      .force("y", d3.forceY().y(d => pathGuate.centroid(d) ? pathGuate.centroid(d)[1] : 0).strength(1))
      // .force("charge", d3.forceManyBody().strength(-1))
      .force("collide", d3.forceCollide().radius(function(d){
        //check if there are massacres during this time period
        var currentYear = d.properties[`massacreMama_${y}_${m}`];
        if(currentYear) {
          return currentYear.r + nodePadding;
        } else {
          return 0;
        }
      })
      .strength(1))
      .stop();

      let i = 0; 
      while (simulation.alpha() > 0.01 && i < 200) {
        simulation.tick(); 
        i++;
      }

      var calculated = simulation.nodes();
      storeSpreadValues(calculated,y,m);
  }

    function storeSpreadValues(calculated,y,m){
      //store calculated x,y positions
      for(var a = 0; a < calculated.length; a++){
          var targetMama = massacreData.municipios[a].mama[y+"_"+m];
          if(targetMama){
              var municipio = calculated[a];
              targetMama.x = round(municipio.x,6);
              targetMama.y = round(municipio.y,6);
          }

      }
    }

}

function round(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}


loadData();