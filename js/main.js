window.onbeforeunload = function () {
  window.scrollTo(0, 0);
}

var svg;
var svgInner;
var albersGuate;
var pathGuate;
var rScale;
var rasterBounds;
var focusWidth;
var circleGroups;
var outerCircles;
var massacresSpread;
var massacreSvg;
var w;
var h;
var scaleFactor;


function loadData(){
    Promise.all([
      d3.json("data/municipios_topo.json"),
      d3.json("data/focusArea_extent.geojson"),
      d3.json("data/raster_extent.geojson"),
      d3.json("data/countries_topo.json"),
      d3.json("data/circle_positions.json"),
      d3.json("data/home_points.geojson")
    ])
    .then(function([municipiosTOPO,focusAreaJSON,rasterAreaJSON,countriesTOPO,circlePositionsJSON,homesJSON]){

        var municipios = topojson.feature(municipiosTOPO, municipiosTOPO.objects.municipios).features;
        var focusBox = focusAreaJSON;
        var rasterBox = rasterAreaJSON;
        var countries = topojson.feature(countriesTOPO, countriesTOPO.objects.countries).features;
        var homes = homesJSON.features;
        massacresSpread = circlePositionsJSON;

        positionMap(municipios,focusBox,rasterBox,countries);
        // drawMunicipios(municipios);
        drawHomes(homes);
        drawMassacres();
        addDiscreteListeners();

    });
}

//creates full screen base map and lines up raster and vector layers
function positionMap(municipios,focusBox,rasterBox,countries){

    w = document.getElementById("map").offsetWidth;
    h = document.getElementById("map").offsetHeight;


    var margin = {top: 5, right: 5, bottom: 5, left: 5}

    //create guatemalaprojection
    const centerLocation = {
      "longitude": -90.2299,
      "latitude": 15.7779
    };
    //albers centered on guatemala
    albersGuate = d3.geoConicEqualArea()
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

    svg = d3.select("div#map")
              .append("svg")
              .attr("class", "magic")
              .attr("viewBox", `0 0 ${w} ${h}`)
              .attr("overflow", "visible")
              .style("position","relative");

    svgInner = svg.append("g")
            .attr("class", "inner");

    //calculate raster extent percentages
    rasterBounds = pathGuate.bounds(rasterBox);

    // var rasterWidth = (rasterBounds[1][0] - rasterBounds[0][0])/w*100;
    var rasterWidth = rasterBounds[1][0] - rasterBounds[0][0];
    var rasterHeight = rasterBounds[1][1] - rasterBounds[0][1];
    var rasterOrigin = [rasterBounds[0][0],rasterBounds[0][1]];

    //append raster background
    svgInner.append("image")
            .attr("href", "img/indigenous_only.jpg")
            .attr("x", rasterOrigin[0])
            .attr("y", rasterOrigin[1])
            .attr("width", rasterWidth + "px")
            .attr("height", rasterHeight + "px");

}


function drawMunicipios(municipioData){

  var colorScale = d3.scaleSequential(d3.interpolateBlues)
                          .domain([0,100]);

    //draw municipios
    var municipios = svgInner.append("g")
                            .selectAll(".municipio")
                            .data(municipioData)
                            .enter()
                            .append("path")
                                .attr("d", pathGuate)
                                .attr("class", "municipio")
                                .attr("fill", "none");

}

function drawHomes(homes){

    var homePoints = svgInner.append("g")
                          .attr("class", "homes")
                          .selectAll("circle")
                          .data(homes)
                          .enter()
                          .append("circle")
                            .attr("cx", d=> albersGuate(d.geometry.coordinates)[0])
                            .attr("cy", d=> albersGuate(d.geometry.coordinates)[1])
                            .attr("r", 2)
                            .attr("fill", "#fff")
                            .attr("stroke", "#000")
                            .attr("stroke-width", 0.3);

}


function drawMassacres(){

    rScale = d3.scaleSqrt()
                  .domain([0,400])
                  .range([0, focusWidth/55]);

    var startTime = "1960_0";
    var currentData = massacresSpread.municipios.filter(m => m.mama[startTime]);


    // viewBox from "calculateCirclePositions" was 0 0 678.359 709
    //need to adjust values to account for the old viewbox
    //cant set directly through viewbox since we will animate for zooming
    scaleFactor = h/709;

    var massacreGroup = svg.append("g");

    circleGroups =  massacreGroup.selectAll(".circleGroups")
                               .attr("class", "circleGroups")
                               .data(currentData)
                               .enter()
                               .append("g")
                               .attr("transform", d => `translate(${d.mama[startTime].x*scaleFactor} ${d.mama[startTime].y*scaleFactor})`);

    // outerCircles = circleGroups.append("circle")
    //            .attr("class", "outerCircle")
    //            .attr("r", d => d.mama[startTime].r)
    //            .attr("fill", "none")
    //            .attr("stroke", "#fff")
    //            .attr("stroke-width", 0.1);

    var massacreCircles = circleGroups.selectAll(".innerCircle")
                    .data(d=> d.mama[startTime].children)
                    .enter()
                    .append("circle")
                       .attr("class", "innerCircle")
                       .attr("cx", d=>d.x*scaleFactor)
                       .attr("cy", d=>d.y*scaleFactor)
                       .attr("r", 0)
                       .attr("r", d=>(d.r-0.1)*scaleFactor)
                       .attr("fill-opacity", 0.9)
                       .attr("fill", "#fff")
                       .attr("stroke", "#555")
                       .attr("stroke-width", 0.1);

}

function updateMassacres(currentData,timePeriod){

  //behaviour for updating groups
  var circleGroups = svg.selectAll(".circleGroups")
                        .data(currentData, d => d["codigo_mun"])
                        .join(
                          enter => enter.append("g")
                                    .attr("class", "circleGroups")
                                    .attr("transform", d => `translate(${d.mama[timePeriod].x*scaleFactor} ${d.mama[timePeriod].y*scaleFactor})`),
                          update => update.attr("transform", d => `translate(${d.mama[timePeriod].x*scaleFactor} ${d.mama[timePeriod].y*scaleFactor})`),
                          exit => exit.remove());

  var massacreCircles = circleGroups.selectAll(".innerChildren")
                      .data(d=> d.mama[timePeriod].children, d=> d.caso ? d.caso : ("c"+ d.caso_ilustrativo))
                      .join(enter=> enter.append("circle")
                                         .attr("class", "innerChildren")
                                         .attr("cx", d=>d.x*scaleFactor)
                                         .attr("cy", d=>d.y*scaleFactor)
                                         .attr("r", d=>(d.r-0.1)*scaleFactor)
                                         .attr("fill-opacity", 0.9)
                                         .attr("fill", "#fff")
                                         .attr("stroke", "#555")
                                         .attr("stroke-width", 0.1),
                            update=> update.attr("cx", d=>d.x*scaleFactor)
                                           .attr("cy", d=>d.y*scaleFactor), 
                            exit => exit.remove());


}


//////////////////////////////////////////////////////////////////////
//////////////////Code for Discrete Animations///////////////////////////////
//////////////////////////////////////////////////////////////////////


  function addDiscreteListeners(){
    
    var stepSel = d3.selectAll(".discrete");

    enterView({
      selector: stepSel.nodes(),
      offset: 0,
      enter: el=> {
        const index = d3.select(el).attr('forward');
        updateChart[index]();
      },
      exit: el => {
        let index = d3.select(el).attr('backward');
        updateChart[index]();
      }
    });
 }


//////discrete animations

var updateChart = {
  zoomToEast: function(){
    console.log("Zoom to east!");
    
    var left = 0.5*w,
    top= 0.5*h,
    width = .3*w,
    height = .3*h;


    svg.transition("zoom east").duration(2000).attr("viewBox", `${left} ${top} ${width} ${height}`);
  },
  zoomOutFull: function(){
    console.log("Zoom out full!");
    svg.transition("Zoom out full!").duration(2000).attr("viewBox", `0 0 ${w} ${h}`);
  }

}

//////////////////////////////////////////////////////////////////////
//////////////////Code for Continuous Animations///////////////////////////////
//////////////////////////////////////////////////////////////////////

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
