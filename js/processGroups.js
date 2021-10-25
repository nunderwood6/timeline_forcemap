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
      d3.json("data/ethnic_groups_municipios.geojson"),
      d3.json("data/municipios_topo.json"),
      d3.json("data/focusArea_extent.geojson"),
      d3.json("data/raster_extent.geojson"),
      d3.json("data/countries_topo.json"),
      d3.json("data/july/massacres_nested.geojson"),
      d3.json("data/packed_test.json")
    ])
    .then(function([groupsJSON,municipiosTOPO,focusAreaJSON,rasterAreaJSON,countriesTOPO,massacresJSON,spreadJSON]){
        var groupsData = groupsJSON.features;
        var municipios = topojson.feature(municipiosTOPO, municipiosTOPO.objects.municipios).features;
        var focusBox = focusAreaJSON;
        var rasterBox = rasterAreaJSON;
        var countries = topojson.feature(countriesTOPO, countriesTOPO.objects.countries).features;
        var massacres = massacresJSON;
        massacresSpread = spreadJSON;

        positionMap(municipios,focusBox,rasterBox,countries);
        drawDotDensity(groupsData);
        drawMassacres(massacres);

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



}


function drawDotDensity(groupsData){

  var colorScale = d3.scaleSequential(d3.interpolateBlues)
                          .domain([0,100]);

    //draw municipios
    var municipios = svg.append("g")
                            .selectAll(".municipio")
                            .data(groupsData)
                            .enter()
                            .append("path")
                                .attr("d", pathGuate)
                                .attr("class", "municipio")
                                .attr("fill", "none");

}

function drawMassacres(massacres){

    rScale = d3.scaleSqrt()
                  .domain([0,400])
                  .range([0, focusWidth/55]);

    //check if there are any massacres in this municipio, if not, discard
    var filtered = massacres.features.filter(function(feature){
        if(feature.properties["massacres"]) return feature;
    });

    var daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31];

    var massacreData = {
                        "municipios": []
                       };


//     // //loop through each time step
//     function doCalculations(){
//         for(var y = 1960; y <=1996; y++){
//             for(var m = 0; m <= 11; m++){
//                 //current time step
//                 var t = new Date(y,m,daysInMonth[m],23,59);
//                 calculateCirclePacks(t,y,m);

//             }
//         }
//     }

//     function doSpreads(){
//       for(var y = 1960; y <=1996; y++){
//             for(var m = 0; m <= 11; m++){
//                 //adjust values with the spread simulation
//                 calculateSpreads(y,m);
//             }
//         }

//     }

//  function calculateSpreads(y,m){

//     var nodePadding = 0.05;
//     const simulation = d3.forceSimulation(filtered)
//     // .force("cx", d3.forceX().x(d => w / 2).strength(0.005))
//     // .force("cy", d3.forceY().y(d => h / 2).strength(0.005))
//     .force("x", d3.forceX().x(d => pathGuate.centroid(d) ? pathGuate.centroid(d)[0] : 0).strength(1))
//     .force("y", d3.forceY().y(d => pathGuate.centroid(d) ? pathGuate.centroid(d)[1] : 0).strength(1))
//     // .force("charge", d3.forceManyBody().strength(-1))
//     .force("collide", d3.forceCollide().radius(function(d){
//       //check if there are massacres during this time period
//       var currentYear = d.properties[`massacreMama_${y}_${m}`];
//       if(currentYear) {
//         return currentYear.r + nodePadding;
//       } else {
//         return 0;
//       }
//     })
//     .strength(1))
//     .stop();

//     let i = 0; 
//     while (simulation.alpha() > 0.01 && i < 200) {
//       simulation.tick(); 
//       i++;
//     }

//     var calculated = simulation.nodes();
//     storeSpreadValues(calculated,y,m);
// }

//   function storeSpreadValues(calculated,y,m){
//     //store calculated x,y positions
//     for(var a = 0; a < calculated.length; a++){
//         var targetMama = massacreData.municipios[a].mama[y+"_"+m];
//         if(targetMama){
//             var municipio = calculated[a];
//             targetMama.x = municipio.x;
//             targetMama.y = municipio.y;
//         }

//     }
//   }


//     function storeEfficiently(){
//         for(var municipio of filtered){
//             var munData = {
//                 "codigo_mun": municipio.properties["codigo_mun"],
//                 "mama": {}
//             }
//           //add data for each time slot if included
//           for(var y = 1960; y <=1996; y++){
//               for(var m = 0; m <= 11; m++){
//                   if(municipio.properties["massacreSiblings_"+y+"_"+m].length > 0){
//                     //add x,y,r for mama
//                     munData.mama[y+"_"+m] = municipio.properties["massacreMama_"+y+"_"+m];
//                     munData.mama[y+"_"+m].children = municipio.properties["massacreSiblings_"+y+"_"+m]

//                   }
//               }
//           }
//           massacreData["municipios"].push(munData);
//         }

//     }

//     doCalculations();
//     storeEfficiently();
//     doSpreads();


//     function calculateCirclePacks(t,y,m){
//         //loop through each municipio
//         for(var municipio of filtered){
//             //store current massacres
//             municipio.properties["massacreSiblings_"+y+"_"+m] = [];
//             //filter to just massacres for the current time
//             for(var i=0; i<municipio.properties["massacres"].length; i++){
//                 //only add if in the current date range
//                 var current = municipio.properties["massacres"][i];
//                 if(Date.parse(current.date) < Date.parse(t)){
//                   //check weird value
//                   if(current["caso ilustrativo"] == "10"){
//                     console.log(current);
//                   }


//                   municipio.properties["massacreSiblings_"+y+"_"+m].push({
//                     "uniqueId": i,
//                     "r": rScale(+current["total_killed"]),
//                     "caso": current.caso,
//                     "caso_ilustrativo": current["caso ilustrativo"]
//                   })
//                 }
//             }
//             municipio.properties["massacreSiblings_"+y+"_"+m] = d3.packSiblings(municipio.properties["massacreSiblings_"+y+"_"+m]);
//             municipio.properties["massacreMama_"+y+"_"+m] = d3.packEnclose(municipio.properties["massacreSiblings_"+y+"_"+m]);
//         }
//     }

//     console.log(massacreData);


 


    var viewBox = `0 0 ${w} ${h}`
    // console.log("viewBox is " +viewBox);
    // console.log(massacresSpread);
    // viewBox is 0 0 629.562 658
    // console.log(massacresSpread);
    var testTime = "1960_0";
    var currentData = massacresSpread.municipios.filter(m => m.mama[testTime]);

    //add spread bubbles
    massacreSvg = svg.append("svg")
                            .attr("viewBox", `0 0 629.562 658`);

    circleGroups =  massacreSvg.append("g")
                           .selectAll(".circleGroups")
                               .attr("class", "circleGroups")
                               .data(currentData)
                               .enter()
                               .append("g")
                               .attr("transform", d => `translate(${d.mama[testTime].x} ${d.mama[testTime].y})`);

    // outerCircles = circleGroups.append("circle")
    //            .attr("class", "outerCircle")
    //            .attr("r", d => d.mama[testTime].r)
    //            .attr("fill", "none")
    //            .attr("stroke", "#fff")
    //            .attr("stroke-width", 0.1);

    var massacreCircles = circleGroups.selectAll(".innerCircle")
                    .data(d=> d.mama[testTime].children)
                    .enter()
                    .append("circle")
                       .attr("class", "innerCircle")
                       .attr("cx", d=>d.x)
                       .attr("cy", d=>d.y)
                       .attr("r", 0)
                       .attr("r", d=>d.r-0.1)
                       .attr("opacity", 0.9)
                       .attr("fill", "#fff")
                       .attr("stroke", "#555")
                       .attr("stroke-width", 0.1);



}

function updateMassacres(currentData,timePeriod){

  //behaviour for updating groups
  var circleGroups = massacreSvg.selectAll(".circleGroups")
                        .data(currentData, d => d["codigo_mun"])
                        .join(
                          enter => enter.append("g")
                                    .attr("class", "circleGroups")
                                    .attr("transform", d => `translate(${d.mama[timePeriod].x} ${d.mama[timePeriod].y})`),
                          update => update.attr("transform", d => `translate(${d.mama[timePeriod].x} ${d.mama[timePeriod].y})`),
                          exit => exit.remove());


  console.log(circleGroups.selectAll(".innerChildren"));

  var massacreCircles = circleGroups.selectAll(".innerChildren")
                      .data(d=> d.mama[timePeriod].children, d=> d.caso ? d.caso : ("c"+ d.caso_ilustrativo))
                      .join(enter=> enter.append("circle")
                                         .attr("class", "innerChildren")
                                         .attr("cx", d=>d.x)
                                         .attr("cy", d=>d.y)
                                         .attr("r", d=>d.r-0.1)
                                         .attr("opacity", 0.9)
                                         .attr("fill", "#fff")
                                         .attr("stroke", "#555")
                                         .attr("stroke-width", 0.1),
                            update=> update.attr("cx", d=>d.x)
                                           .attr("cy", d=>d.y), 
                            exit => exit.remove());

  console.log(massacreCircles);


}

// function makeSiblingPack(features,attribute,radiusAttribute,t){

//   //for each municipality
//   for(var feature of features){
//     //if the municipality has massacres
//     if(feature.properties[attribute]){
//       //create a property to store the calculations
//       feature.properties[attribute+"_siblings"] = [];
//       //loop through the massacres in this municipality
//       for(var i=0; i < feature.properties[attribute].length; i++){
//           var current = feature.properties[attribute][i];
//           //make sure the circle has the date included for filterting
//           feature.properties[attribute+"_siblings"].push({
//             "uniqueId": i,
//             "r": rScale(+current[radiusAttribute]),
//             "date": current.date
//           });
//       }
//      //calculate offsets for the small circles, and calculate size of the smallest enclosing circle
//      feature.properties[attribute+"_siblings"] = d3.packSiblings(feature.properties[attribute+"_siblings"]);
//      feature.properties[attribute+"_mama"] = d3.packEnclose(feature.properties[attribute+"_siblings"]);
//     } 
//   }

//   var nonZero = features.filter(function(feature){
//     if(feature.properties[attribute+"_siblings"].length>0) return feature;
//   });

//   return nonZero;
// }

// function applySimulation(nodes){
//     var nodePadding = 0.05;
//     const simulation = d3.forceSimulation(nodes)
//     // .force("cx", d3.forceX().x(d => w / 2).strength(0.005))
//     // .force("cy", d3.forceY().y(d => h / 2).strength(0.005))
//     .force("x", d3.forceX().x(d => pathGuate.centroid(d) ? pathGuate.centroid(d)[0] : 0).strength(1))
//     .force("y", d3.forceY().y(d => pathGuate.centroid(d) ? pathGuate.centroid(d)[1] : 0).strength(1))
//     // .force("charge", d3.forceManyBody().strength(-1))
//     .force("collide", d3.forceCollide().radius(d => d.properties["massacres_mama"].r  + nodePadding).strength(1))
//     .stop();

//     let i = 0; 
//     while (simulation.alpha() > 0.01 && i < 200) {
//       simulation.tick(); 
//       i++;
//     }

//     return simulation.nodes();
// }

var timeDomain = [new Date(1960,0,1), new Date(1969,11,31)];
var timeDomain2 = [new Date(1970,0,1), new Date(1979,11,31)];
var timeDomain3 = [new Date(1980,0,1), new Date(1982,11,31)];
var timeDomain4 = [new Date(1983,0,1), new Date(1996,11,31)];

var timeScale = d3.scaleLinear()
                    .domain(timeDomain)
                    .range([0,1]);

var timeScale2 = d3.scaleLinear()
                    .domain(timeDomain2)
                    .range([0,1]);

var timeScale3 = d3.scaleLinear()
                    .domain(timeDomain3)
                    .range([0,1]);


function fmtMonthYear(time){
  var dateObj = new Date(time);
  var month = dateObj.toLocaleString('default', { month: 'long' });
  var year = dateObj.getFullYear();
  return month + " " + year;
}

function fmtMonthYearNum(time){
  var dateObj = new Date(time);
  var month = dateObj.getMonth();
  var year = dateObj.getFullYear();
  return year + "_" + month;
}

var currentDisplayTime = 1960;
var yearElement = d3.select("p.year");

//////////////////////////////////////////////////////////////////////
//////////////////1)Smooth Animations, with RAF///////////////////////////////
//////////////////////////////////////////////////////////////////////

//observer for timeline
var observerOptions = {
  root: null,
  rootMargin: "0px",
  threshold: [0,0.1]
}

let observer = new IntersectionObserver(intersectionCallback, observerOptions);
var target = d3.select(".time1").node();
observer.observe(target);

var latestKnownTop = window.innerHeight;
var ticking = false;

function onScroll(){
  latestKnownTop = target.getBoundingClientRect().top;
  requestTick();
}

function requestTick(){
  if(!ticking){
      requestAnimationFrame(update);
  }
  ticking = true;
}
var accelAmmount = 0.9;

function update(){
    //reset tick to capture next scroll
  ticking = false;
  
  var currentTop = latestKnownTop;
  var percent = (window.innerHeight - currentTop)/ window.innerHeight;
  if(percent>1) percent = 1;
  if(percent<0) percent = 0;

  var newTime = timeScale.invert(percent);
  var newDisplayTime = fmtMonthYear(newTime);
  var timePeriod = fmtMonthYearNum(newTime);


  if(newDisplayTime != currentDisplayTime){
    //update year text
    currentDisplayTime = newDisplayTime
    yearElement.text(currentDisplayTime);
    //update massacres
    var currentData = massacresSpread.municipios.filter(m => m.mama[timePeriod]);
    updateMassacres(currentData,timePeriod);

  }

}

var listening;

function intersectionCallback(entries, observer){
  if(entries[0].intersectionRatio>0){
    if(!listening) {
      window.addEventListener("scroll",onScroll);
    }
    listening = true;
  } else {
    window.removeEventListener("scroll", onScroll);
    listening = false;
  }
}

//duplicate
////////////////////////////////////////////

let observer2 = new IntersectionObserver(intersectionCallback2, observerOptions);
var target2 = d3.select(".time2").node();
observer2.observe(target2);


function onScroll2(){
  latestKnownTop2 = target2.getBoundingClientRect().top;
  requestTick2();
}

var ticking2 = false;

function requestTick2(){
  if(!ticking2){
      requestAnimationFrame(update2);
  }
  ticking2 = true;
}

function update2(){
    //reset tick to capture next scroll
  ticking2 = false;
  
  var currentTop = latestKnownTop2;
  var percent = (window.innerHeight - currentTop)/ window.innerHeight;
  if(percent>1) percent = 1;
  if(percent<0) percent = 0;

  var newTime = timeScale2.invert(percent);

  var newDisplayTime = fmtMonthYear(newTime);
  var timePeriod = fmtMonthYearNum(newTime);


  if(newDisplayTime != currentDisplayTime){
    //update year text
    currentDisplayTime = newDisplayTime
    yearElement.text(currentDisplayTime);
    //update massacres
    var currentData = massacresSpread.municipios.filter(m => m.mama[timePeriod]);
    updateMassacres(currentData,timePeriod);

  }

}

var listening2;

function intersectionCallback2(entries, observer){
  if(entries[0].intersectionRatio>0){
    if(!listening) {
      window.addEventListener("scroll",onScroll2);
    }
    listening2 = true;
  } else {
    window.removeEventListener("scroll", onScroll2);
    listening2 = false;
  }
}


////////////////////////////////////////////

let observer3 = new IntersectionObserver(intersectionCallback3, observerOptions);
var target3 = d3.select(".time3").node();
observer3.observe(target3);


function onScroll3(){
  latestKnownTop3 = target3.getBoundingClientRect().top;
  requestTick3();
}

var ticking3 = false;

function requestTick3(){
  if(!ticking3){
      requestAnimationFrame(update3);
  }
  ticking3 = true;
}

function update3(){
    //reset tick to capture next scroll
  ticking3 = false;
  
  var currentTop = latestKnownTop3;
  var percent = (window.innerHeight - currentTop)/ window.innerHeight;
  if(percent>1) percent = 1;
  if(percent<0) percent = 0;

  var newTime = timeScale3.invert(percent);

  var newDisplayTime = fmtMonthYear(newTime);
  var timePeriod = fmtMonthYearNum(newTime);


  if(newDisplayTime != currentDisplayTime){
    //update year text
    currentDisplayTime = newDisplayTime
    yearElement.text(currentDisplayTime);
    //update massacres
    var currentData = massacresSpread.municipios.filter(m => m.mama[timePeriod]);
    updateMassacres(currentData,timePeriod);

  }

}

var listening3;

function intersectionCallback3(entries, observer){
  if(entries[0].intersectionRatio>0){
    if(!listening) {
      window.addEventListener("scroll",onScroll3);
    }
    listening2 = true;
  } else {
    window.removeEventListener("scroll", onScroll3);
    listening2 = false;
  }
}



loadData();
