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
var focusHeight;
var circleGroups;
var outerCircles;
var massacresSpread;
var massacreSvg;
var w;
var h;
var scaleFactor;
var marginAmount = 5;
var zoomBox;
var renderedBox;
var zoomFactor;

// const zoom = d3.zoom()
//       .scaleExtent([1, 8])
//       .on("zoom", zoomed);


// function zoomed() {
//     svgInner.attr("transform", d3.event.transform);
//     svgInner.attr("stroke-width", 1 / d3.event.transform.k);
//   }


function loadData(){
    Promise.all([
      d3.json("data/municipios_topo.json"),
      d3.json("data/focusArea_extent.geojson"),
      d3.json("data/raster_extent.geojson"),
      d3.json("data/countries_topo.json"),
      d3.json("data/circle_positions.json"),
      d3.json("data/home_points.geojson"),
      d3.json("data/departamentos_topo.json")
    ])
    .then(function([municipiosTOPO,focusAreaJSON,rasterAreaJSON,countriesTOPO,circlePositionsJSON,homesJSON,departamentosTOPO]){

        var municipios = topojson.feature(municipiosTOPO, municipiosTOPO.objects.municipios).features;
        var departamentos = topojson.feature(departamentosTOPO,departamentosTOPO.objects.departamentos).features;
        var focusBox = focusAreaJSON;
        var rasterBox = rasterAreaJSON;
        var countries = topojson.feature(countriesTOPO, countriesTOPO.objects.countries).features;
        var homes = homesJSON.features;
        massacresSpread = circlePositionsJSON;

        positionMap(municipios,focusBox,rasterBox,countries);
        drawMunicipios(municipios,departamentos);
        drawHomes(homes);
        drawMassacres();
        addDiscreteListeners();
        addLabels();


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
    focusHeight = computedBox[1][1] - computedBox[0][1];



    svg = d3.select("div#map")
              .append("svg")
              .attr("class", "magic")
              .style("width", "100%")
              .style("height", "100%")
              // .style("max-width", "none")
              // .style("max-height", "none")
              .attr("viewBox", `0 0 ${w} ${h}`)
              .attr("preserveAspectRatio", "xMidYMid meet")
              .attr("overflow", "visible")
              .style("position","relative");

    svgInner = svg.append("g")
            .attr("class", "inner")
            // .attr("overflow", "visible")
            // .attr("viewBox", `0 0 ${w} ${h}`);

    //add focusBox as rectangle so we can calculate bbox for scaling later
    renderedBox = svgInner.append("rect")
              .attr("x", computedBox[0][0])
              .attr("y", computedBox[0][1])
              .attr("width", focusWidth)
              .attr("height", focusHeight)
              .attr("fill", "none")
              .attr("stroke", "#fff")
              .attr("stroke-width", 2);

    calculateZoomFactor();

    //calculate raster extent percentages
    rasterBounds = pathGuate.bounds(rasterBox);

    // var rasterWidth = (rasterBounds[1][0] - rasterBounds[0][0])/w*100;
    var rasterWidth = rasterBounds[1][0] - rasterBounds[0][0];
    var rasterHeight = rasterBounds[1][1] - rasterBounds[0][1];
    var rasterOrigin = [rasterBounds[0][0],rasterBounds[0][1]];

    //append raster background
    svgInner.append("image")
            .attr("href", "img/dot_all.jpg")
            .attr("x", rasterOrigin[0])
            .attr("y", rasterOrigin[1])
            .attr("width", rasterWidth + "px")
            .attr("height", rasterHeight + "px");

    //add event listener for resize
    d3.select(window).on('resize', calculateZoomFactor);

}


function drawMunicipios(municipioData,departamentoData){

  // var colorScale = d3.scaleSequential(d3.interpolateBlues)
  //                         .domain([0,100]);

    //draw municipios
    var municipios = svgInner.append("g")
                            .selectAll(".municipio")
                            .data(municipioData)
                            .enter()
                            .append("path")
                                .attr("d", pathGuate)
                                .attr("class", "municipio")
                                .attr("id", function(d){
                                  return "m" + d.properties["codigo_mun"];
                                })
                                .attr("fill", "none");

    // var departamentos = svgInner.append("g")
    //                         .selectAll(".departamento")
    //                         .data(departamentoData)
    //                         .enter()
    //                         .append("path")
    //                             .attr("d", pathGuate)
    //                             .attr("class", "departamento")
    //                             .attr("fill", "none");


}

function drawHomes(homes){

    var symbolSize = 2;
    var labelPadding = 0.5;

    var homePoints = svgInner.append("g")
                          .attr("class", "homes")
                          .selectAll("circle")
                          .data(homes)
                          .enter()
                          .append("rect")
                            .attr("x", d=> albersGuate(d.geometry.coordinates)[0]-symbolSize/2)
                            .attr("y", d=> albersGuate(d.geometry.coordinates)[1]-symbolSize/2)
                            .attr("width", symbolSize)
                            .attr("height", symbolSize)
                            .attr("fill", "#fff")
                            .attr("stroke", "#000")
                            .attr("stroke-width", 0.5);

    //home labels
    var homeLabels = svgInner.append("g")
                        .attr("class", "homeLabels")
                        .selectAll("text")
                        .data(homes)
                        .enter()
                        .append("g")
                          .attr("class", d=> d.properties["name"] + " label")
                          .attr("transform", function(d){
                            if(d.properties.position == "right"){
                              var x = albersGuate(d.geometry.coordinates)[0]+(symbolSize+labelPadding);
                              var y = albersGuate(d.geometry.coordinates)[1]-(symbolSize+labelPadding);
                            } else {
                              var x = albersGuate(d.geometry.coordinates)[0]-(symbolSize+labelPadding);
                              var y = albersGuate(d.geometry.coordinates)[1]+(symbolSize+labelPadding);
                            }
                            return `translate(${x},${y})`;
                          })
                          .html(function(d){
                            if(d.properties.position == "right"){
                              return `<text><tspan x="0" dy="-0.5em">${d.properties["name"]+ "'s home"}</tspan>
                                   <tspan x="0" dy="1em">${d.properties["town"]}</tspan></text>`;
                            } else {
                              return `<text><tspan x="1" dx="0.2em" dy="0.5em">${d.properties["town"]}</tspan>
                                   <tspan x="0" dx="0.2em" dy="1em">${d.properties["name"]+ "'s home"}</tspan></text>`;
                            }
                          })
                          .attr("font-size", d=>d.textSize)
                          .attr("text-anchor", function(d){
                              if(d.properties.position == "right"){
                                var anchor = "start";
                              } else{
                                var anchor = "end";
                              }
                              return anchor;
                          })
                          .attr("opacity", 0)
                          .attr("fill", "#fff")
                          .attr("font-weight", "bold")
                          .attr("text-shadow", "text-shadow: -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black;");


     // //testing viewbox
     // zoomBox = svgInner.append("rect")
     //                .attr("x", .35*w)
     //                .attr("y", .35*h)
     //                .attr("width", .40*w)
     //                .attr("height", .36*h)
     //                .attr("stroke", "#fff")
     //                .attr("fill", "none");

}

function addLabels(){

    calculateZoomFactor();

    var labels = svgInner.append("g").attr("class", "labels");

    //eastern labels
    var east = labels.append("g")
              .attr("class", "east");

    var eastLabels = [
      {"text": "Lago de Izabal",
        "x": ".76",
        "y": ".57",
        "textSize": 11,
        "font-style": "italic",
        "fill": "#aaa",
      },
      {"text": "Ch'orti'   Territory",
        "x": ".72",
        "y": ".735",
        "textSize": 14,
        "fill": "#fffee0",
        "letter-spacing": "2.5px",
        "font-weight": "bold"
      }
    ];

    labels.selectAll(".eastLabel")
          .data(eastLabels)
          .enter()
          .append("text")
              .attr("class", "label eastLabel")
              .attr("x", d=>d.x*w)
              .attr("y", d=>d.y*h)
              .attr("font-size", d => d.textSize*zoomFactor +"px")
              .attr("font-style", d=> d["font-style"] ? d["font-style"] : "normal")
              .attr("fill", d => d.fill)
              .attr("text-anchor", "middle")
              .attr("letter-spacing", d=> d["letter-spacing"] ? d["letter-spacing"] : "normal")
              .attr("font-weight", d=> d["font-weight"] ? d["font-weight"] : "normal")
              .attr("opacity", 0)
              .attr("text-shadow", "2px 2px 1px black;")
              .text(d=>d["text"]);

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
                       .attr("caso", d=>d.caso)
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
                                         .attr("caso", d=> d.caso ? ("c"+ d.caso) : ("c"+ d.caso_ilustrativo))
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



var calculateZoomFactor = debounce(function (){
  console.log("calculating")
  var originalBoxWidth = renderedBox.node().getBBox().width;
  var clientBoxWidth = renderedBox.node().getBoundingClientRect().width;
  zoomFactor = originalBoxWidth/clientBoxWidth;
  resizeLabels();
},100);

function resizeLabels(){

  svg.selectAll(".label")
        .attr("font-size", function(d){
          return d.textSize*zoomFactor +"px";
        });
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

    var w2 = .30*w,
    h2 = 0.36*h,
    left = 0.55*w,
    top= 0.51*h;

    //consider trying this: OR setting slice instead of meet
    //would need to add resize listener and update 
    // //tall aspect ratio/mobile numbers
    // var w2 = .30*w,
    // h2 = 0.30*h,
    // left = 0.55*w,
    // top= 0.55*h;

    //zoom
    svg.transition("zoom east").duration(1500).attr("viewBox", `${left} ${top} ${w2} ${h2}`)
            .on("end", function(){
              //resized, need to calculate zoom
              calculateZoomFactor();
              //fade in east labels
              svg.selectAll(".eastLabel,.Wilmer,.Juan").transition("fade in east labels")
                                         .duration(500)
                                         .attr("opacity", 1);
              // //highlight camotan
              // svg.select("#m2005").classed("highlight", true);

            });


  },
  zoomOutFull: function(){
    svg.transition("Zoom out full!").duration(1500).attr("viewBox", `0 0 ${w} ${h}`)
                .on("end", function(){
                    calculateZoomFactor();
                });
    svg.selectAll(".eastLabel,.Wilmer,.Juan").transition("fade out east labels")
                               .duration(500)
                               .attr("opacity", 0);
  },
  zoomToPanzos: function(){

      var w2 = .40*w,
      h2 = 0.36*h,
      left = 0.38*w,
      top= 0.35*h;
      //zoom to new location
      svg.transition("Zoom panzos").duration(1500).attr("viewBox", `${left} ${top} ${w2} ${h2}`)
                .on("end", function(){
                    calculateZoomFactor();
                });
      //zoom out old labels
      svg.selectAll(".eastLabel,.Wilmer,.Juan").transition("fade out east labels")
                                 .duration(500)
                                 .attr("opacity", 0);
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
    if(!listening2) {
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
    if(!listening3) {
      window.addEventListener("scroll",onScroll3);
    }
    listening2 = true;
  } else {
    window.removeEventListener("scroll", onScroll3);
    listening2 = false;
  }
}

function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

loadData();
