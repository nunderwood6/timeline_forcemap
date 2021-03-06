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
var yearlyTotals;
var bars;
var overallTimePercent;
var timeIndicator;
var animationIndex = 0;
var defendersData;

var massacreAnnotations =  [
      {"case": "c47",
       "date": "February 1967",
       "location": "Cajón del Río",
       "group": "chorti",
       "killed": 14,
       "x": 4,
       "y": 40,
       "textSize": {mobile:11,desktop:12},
       "width": {mobile:45,desktop:70},
       "xAlign": "right",
       "yAlign": "top",
       "text": "“Many from here are [still] in Honduras. Almost half of the village left.” —Survivor",
       "animationIndex": 1
      },
      {"case": "c1004",
       "date": "November 1966",
       "location": "Río Hondo",
       "group": "chorti",
       "killed": 61,
       "x": -2,
       "y": -10,
       "textSize": {mobile:11,desktop:12},
       "width": {mobile:38,desktop:70},
       "xAlign": "left",
       "yAlign": "bottom",
       "text": "The soldiers doused them with gasoline and began to throw paper balls at them with fire. The victims were burned alive. —CEH",
       "animationIndex": 1
      },
      {"case": "c9",
       "date": "May 1978",
       "location": "Panzós",
       "group": "qeqchi",
       "killed": 53,
       "x": -5,
       "y": 0,
       "textSize": {mobile:11,desktop:12},
       "width": {mobile:80,desktop:120},
       "xAlign": "left",
       "yAlign": "bottom",
       "text": "“If they want land, they will have it in the cemetary.” —Soldier, just before massacre",
       "animationIndex": 2
      },
      {"case": "c10_1",
       "date": "February 1982",
       "location": "Río Negro",
       "group": "achi",
       "killed": 74,
       "x": 10,
       "y": -52,
       "textSize": {mobile:11,desktop:12},
       "width": {mobile:42,desktop:100},
       "xAlign": "right",
       "yAlign": "top",
       "text": "“In the community before [it was] calm, after the construction of the dam is when many problems arose.”",
       "animationIndex": 3
      },
      {"case": "c10_2",
       "date": "March 1982",
       "location": "Río Negro",
       "group": "achi",
       "killed": 177,
       "victimType": "women and children ",
       "x": 7,
       "y": 13,
       "textSize": {mobile:11,desktop:12},
       "width": {mobile:40,desktop:100},
       "xAlign": "right",
       "yAlign": "bottom",
       "text": `"There I lost my family, well, my brother, wife, nephews, mother-in-law, brother-in-law, comrades, aunts, everyone there...nobody stayed in the village, we went to the mountains...we were abandoned, without spirit."`,
       "animationIndex": 3
      },
      {"case": "c18",
       "date": "July 1982",
       "location": "San Francisco",
       "group": "chuj",
       "killed": 350,
       "x": 10,
       "y": -93,
       "textSize": {mobile:11,desktop:12},
       "width": {mobile:60,desktop:100},
       "xAlign": "right",
       "yAlign": "top",
       "text": `“After they killed our women, they took our children, little ones of ten, eight, five and four years old, they just grabbed their legs and smashed them on the roofs of the houses, and left the brains of the little ones torn apart like corn dough. I had six children, all of them died...also my wife. None were left alive.”`,
       "animationIndex": 4,
       "double": true
      },
      {"case": "c18",
       "date": "July 1982",
       "location": "San Francisco",
       "group": "chuj",
       "killed": 350,
       "x": 10,
       "y": -50,
       "textSize": {mobile:11,desktop:12},
       "width": {mobile:70,desktop:100},
       "xAlign": "right",
       "yAlign": "top",
       "text": `Once the soldiers finished the massacre, they put the meat of the oxen that they had butchered on the fire and ate, drank and danced to the music of the radio-recorders that they stole from the houses. Before leaving, they set fire to the village.`,
       "animationIndex": 4,
       "second": true
      }
];

var casesWithAnnotations = massacreAnnotations.map(d=>d.case);



function loadData(){
    Promise.all([
      d3.json("data/municipios_topo.json"),
      d3.json("data/focusArea_extent.geojson"),
      d3.json("data/raster_extent.geojson"),
      d3.json("data/countries_topo.json"),
      d3.json("data/circle_positions.json"),
      d3.json("data/home_points.geojson"),
      d3.json("data/departamentos_topo.json"),
      d3.json("data/yearly_totals.json"),
      d3.csv("data/defenders_data.csv")
    ])
    .then(function([municipiosTOPO,focusAreaJSON,rasterAreaJSON,countriesTOPO,circlePositionsJSON,homesJSON,departamentosTOPO,yearlyTotalsJSON,defendersCSV]){

        var municipios = topojson.feature(municipiosTOPO, municipiosTOPO.objects.municipios).features;
        var departamentos = topojson.feature(departamentosTOPO,departamentosTOPO.objects.departamentos).features;
        var focusBox = focusAreaJSON;
        var rasterBox = rasterAreaJSON;
        var countries = topojson.feature(countriesTOPO, countriesTOPO.objects.countries).features;
        var homes = homesJSON.features;
        massacresSpread = circlePositionsJSON;
        yearlyTotals = yearlyTotalsJSON;
        defendersData = defendersCSV;

        positionMap(municipios,focusBox,rasterBox,countries);
        drawMunicipios(municipios,departamentos);
        drawHomes(homes);
        drawMassacres();
        addDiscreteListeners();
        addLabels();
        renderMassacreChart();

        //build defenders map
        // renderDefendersData();

    });
}

//creates full screen base map and lines up raster and vector layers
function positionMap(municipios,focusBox,rasterBox,countries){

    w = document.getElementById("map").offsetWidth;
    h = document.getElementById("map").offsetHeight;


    var margin = {top: 5, right: 5, bottom: 5, left: 5}
    // var margin = {top: 0, right: 0, bottom: 0, left: 0}

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



            console.log(computedBox);
    //add focusBox as rectangle so we can calculate bbox for scaling later
    renderedBox = svgInner.append("rect")
              .attr("x", computedBox[0][0])
              .attr("y", computedBox[0][1])
              .attr("width", focusWidth)
              .attr("height", focusHeight)
              .attr("fill", "none")
              .attr("stroke", "#fff")
              .attr("stroke-width", 0.25);

    calculateZoomFactor();

    //calculate raster extent percentages
    rasterBounds = pathGuate.bounds(rasterBox);

    // var rasterWidth = (rasterBounds[1][0] - rasterBounds[0][0])/w*100;
    var rasterWidth = rasterBounds[1][0] - rasterBounds[0][0];
    var rasterHeight = rasterBounds[1][1] - rasterBounds[0][1];
    var rasterOrigin = [rasterBounds[0][0],rasterBounds[0][1]];

    //append raster backgrounds
    svgInner.append("image")
            .attr("href", "img/dot_all.jpg")
            .attr("class", "allDot")
            .attr("x", rasterOrigin[0])
            .attr("y", rasterOrigin[1])
            .attr("width", rasterWidth + "px")
            .attr("height", rasterHeight + "px")
            .attr("opacity", "1");

    //append binary
    svgInner.append("image")
            .attr("href", "img/dot_binary_65p.jpg")
            .attr("class", "binaryDot")
            .attr("x", computedBox[0][0])
            .attr("y", computedBox[0][1])
            .attr("width", focusWidth)
            .attr("height", focusHeight)
            .attr("x", rasterOrigin[0])
            .attr("y", rasterOrigin[1])
            .attr("width", rasterWidth + "px")
            .attr("height", rasterHeight + "px")
            .attr("opacity", "0");

    // renderedBox = svgInner.append("rect")
    //           .attr("x", computedBox[0][0])
    //           .attr("y", computedBox[0][1])
    //           .attr("width", focusWidth)
    //           .attr("height", focusHeight)
    //           .attr("fill", "none")
    //           .attr("stroke", "#fff")
    //           .attr("stroke-width", 0.2);

    //add event listener for resize
    d3.select(window).on('resize', resized);

    function resized(){
      calculateZoomFactor();
      debounce(renderMassacreChart());
    }

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
                                .attr("fill", "none")
                                .style("display", "none");

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
                          .attr("class", d => "homes")
                          .selectAll("circle")
                          .data(homes)
                          .enter()
                          .append("rect")
                            .attr("class", d => d.properties["name"])
                            .attr("x", d=> albersGuate(d.geometry.coordinates)[0]-symbolSize/2)
                            .attr("y", d=> albersGuate(d.geometry.coordinates)[1]-symbolSize/2)
                            .attr("width", symbolSize)
                            .attr("height", symbolSize)
                            .attr("fill", "#fff")
                            .attr("stroke", "#000")
                            .attr("stroke-width", 0.25)
                            .attr("opacity", 0);

    //home labels
    var homeLabels = svgInner.append("g")
                        .attr("class", "homeLabels")
                        .selectAll("text")
                        .data(homes)
                        .enter()
                        .append("g")
                          .attr("class", d=> d.properties["name"] + " label")
                          .attr("transform", function(d){
                            if(d.properties.positionX == "right"){
                              var x = albersGuate(d.geometry.coordinates)[0]+(symbolSize+labelPadding);
                            } else {
                              var x = albersGuate(d.geometry.coordinates)[0]-(symbolSize+labelPadding); 
                            }
                            if(d.properties.positionY == "top") var y = albersGuate(d.geometry.coordinates)[1]-(symbolSize+labelPadding);
                            else var y = albersGuate(d.geometry.coordinates)[1]+(symbolSize+labelPadding);
                            return `translate(${x},${y})`;
                          })
                          .html(function(d){
                            if(d.properties.positionY == "top"){
                              return `<text><tspan x="0" dy="-0.5em">${d.properties["name"]+ "'s home"}</tspan>
                                   <tspan x="0" dy="1em">${d.properties["town"]}</tspan></text>`;
                            } else {
                              return `<text><tspan x="0" dy="-0.2em">${d.properties["town"]}</tspan>
                                   <tspan x="0" dy="1em">${d.properties["name"]+ "'s home"}</tspan></text>`;
                            }
                          })
                          .attr("dominant-baseline", d => (d.properties.positionY == "top") ? "auto" : "hanging")
                          .attr("font-size", d=>d.textSize)
                          .attr("text-anchor", function(d){
                              if(d.properties.positionX == "right"){
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


     //testing Achi viewbox

     // zoomBox = svgInner.append("rect")
     //                .attr("x", .28*w)
     //                .attr("y", .48*h)
     //                .attr("width", .30*w)
     //                .attr("height", .30*h)
     //                .attr("stroke", "#fff")
     //                .attr("fill", "none");

}

function addLabels(){

    calculateZoomFactor();

    var labels = svgInner.append("g").attr("class", "labels");

    var labelData = [
      // {"text": "Lago de Izabal",
      //   "class": "chorti",
      //   "x": ".76",
      //   "y": ".57",
      //   "textSize": {mobile:11,
      //               desktop:12},
      //   "font-style": "italic",
      //   "fill": "#aaa",
      // },
      // {"text": "Ch'orti' Territory",
      //   "class": "chorti",
      //   "x": ".72",
      //   "y": ".735",
      //   "textSize": {mobile:14,
      //               desktop:16},
      //   "fill": "#fffee0",
      //   "letter-spacing": "2.5px",
      //   "font-weight": "bold"
      // },
      {"text": "Q'eqchi' Territory",
        "class": "qeqchi",
        "x": ".57",
        "y": ".525",
        "textSize": {mobile:14,
                    desktop:16},
        "fill": "#fbd6ff",
        "letter-spacing": "3.5px",
        "font-weight": "bold"
      }
    ];


    labels.selectAll(".label")
          .data(labelData)
          .enter()
          .append("text")
              .attr("class", d=> `label ${d["class"]}`)
              .attr("x", d=>d.x*w)
              .attr("y", d=>d.y*h)
              .attr("font-size", function(d){
                  if(isMobile.matches) return d.textSize.mobile*zoomFactor +"px";
                  else return d.textSize.desktop*zoomFactor +"px";
              })
              .attr("font-style", d=> d["font-style"] ? d["font-style"] : "normal")
              .attr("fill", d => d.fill)
              .attr("text-anchor", "middle")
              .attr("letter-spacing", d=> d["letter-spacing"] ? d["letter-spacing"] : "normal")
              .attr("font-weight", d=> d["font-weight"] ? d["font-weight"] : "normal")
              .attr("opacity", 0)
              .attr("text-shadow", "2px 2px 1px black;")
              .attr("style","white-space:pre")
              .text(d=>d["text"]);

}


function renderMassacreChart(){


  var labelColumn = "year";
  var valueColumn = "massacres";

  // var aspectWidth = isMobile.matches ? 4 : 16;
  // var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 20,
    right: 10,
    bottom: 20,
    left: 30
  };

  var ticksY = 4;
  var ticksX = 5;
  var roundTicksFactor = 500;

  var container = document.querySelector("div.chart");

  var chartWidth = container.offsetWidth - margins.left - margins.right;
  var chartHeight = 60;
    // Math.ceil((container.offsetWidth * aspectHeight) / aspectWidth) -
    // margins.top -
    // margins.bottom;

  //clear for redraw
  var containerElement = d3.select(container);
  containerElement.select("svg").remove();

  var chartElement = containerElement
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  var xScale = d3.scaleBand()
    .range([0, chartWidth])
    .round(true)
    .padding(0.1)
    .domain(yearlyTotals.map(d => d[labelColumn]));

    var floors = yearlyTotals.map(
      d => Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor
    );

    var min = Math.min(...floors);

    if (min > 0) {
      min = 0;
    }

    var ceilings = yearlyTotals.map(
      d => Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor
    );

    var max = Math.max(...ceilings);

    var yScale = d3
      .scaleLog()
      .domain([0.7, 500])
      .range([chartHeight, 0]);

    // Create D3 axes.
    var xAxis = d3
      .axisBottom()
      .scale(xScale)
      .tickValues([1965,1970,1975,1980,1985,1990,1995]);

    var yAxis = d3
      .axisLeft()
      .scale(yScale)
      .tickValues([10,100,500])
      .tickFormat(function (d) {
            return fmtComma(d);
      })

    // Render axes to chart.
    chartElement
      .append("g")
      .attr("class", "x axis")
      .attr("aria-hidden", "true")
      .attr("transform", makeTranslate(0, chartHeight))
      .call(xAxis);

    chartElement
      .append("g")
      .attr("class", "y axis")
      .attr("aria-hidden", "true")
      .call(yAxis);

      //y axis grid
      var yAxisGrid = function() {
        return yAxis;
      };

      chartElement
        .append("g")
        .attr("class", "y grid")
        .call(
          yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat("")
        );


      // Render bars to chart.
      bars = chartElement
        .append("g")
        .attr("class", "bars")
        .selectAll("rect")
        .data(yearlyTotals)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d[labelColumn]))
        .attr("y", d => (d[valueColumn] <= 0 ? yScale(0.7) : yScale(d[valueColumn])))
        .attr("width", xScale.bandwidth())
        .attr("height", d =>
          d[valueColumn] <= 0
            ? 0
            : yScale(0.7) - yScale(d[valueColumn])
        )
        .attr("class", function(d) {
          return "bar"+d[labelColumn];
        });


          // add time indicator.
        timeIndicator = chartElement
            .append("path")
                .attr("d", function(d){
                  return `M ${xScale(1965)} ${yScale(0.6)}H ${xScale(1995)+xScale.bandwidth()}`
                })
                .attr("stroke", "#fff")
                .attr("stroke-width", 2)
                .attr("fill", "none")
                .attr("stroke-dasharray", function(d){
                  return d3.select(this).node().getTotalLength();
                })
                .attr("stroke-dashoffset", function(d){
                  return d3.select(this).node().getTotalLength();
                });

}


function drawMassacres(){

    rScale = d3.scaleSqrt()
                  .domain([0,400])
                  .range([0, focusWidth/55]);

    var startTime = "1965_0";
    var currentData = massacresSpread.municipios.filter(m => m.mama[startTime]);

    // viewBox from "calculateCirclePositions" was 0 0 678.359 709
    //need to adjust values to account for the old viewbox
    //cant set directly through viewbox since we will animate for zooming
    scaleFactor = h/653;

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
                         .join(enter => enter.append("g")
                              .attr("class", function(d){
                                var currentCase = d.caso ? ("c"+ d.caso) : ("c"+ d.caso_ilustrativo);
                                return "innerChildren " + currentCase;
                              })
                              .attr("transform", d => makeTranslate(d.x*scaleFactor,d.y*scaleFactor))
                                   .append("circle")
                                   .attr("r", d=>(d.r-0.1)*scaleFactor)
                                   .attr("fill-opacity", 0.8)
                                   .attr("fill", "#fff")
                                   .attr("stroke", "#555")
                                   .attr("stroke-width", function(d){
                                    //add massacre annotations
                                    var currentCase = d.caso ? ("c"+ d.caso) : ("c"+ d.caso_ilustrativo);
                                    //check if it has a massacre annotation, if so render
                                    var currentAnnotationIndex = casesWithAnnotations.indexOf(currentCase);
                                    if(currentAnnotationIndex != -1){
                                        //add annotation
                                        var label = massacreAnnotations[currentAnnotationIndex];
                                        //bind data
                                        var labelG = d3.select(this.parentNode)
                                                          .append("g")
                                                          .attr("opacity", 0)
                                                          .attr("class", `massacreAnnotation ${label.group}`)
                                                          .datum(label)

                                        renderMassacreAnnotation(labelG);

                                        //check for double
                                        if(label.double){


                                          var label2 = massacreAnnotations[currentAnnotationIndex+1];

                                          var labelG2 = d3.select(this.parentNode)
                                                          .append("g")
                                                          .attr("opacity", 0)
                                                          .attr("class", `massacreAnnotation ${label.group}`)
                                                          .datum(label2);
                                          renderMassacreAnnotation(labelG2);

                                          if(label2.animationIndex == animationIndex){
                                              labelG2.transition("fade in annotation")
                                                    .duration(500)
                                                    .attr("opacity", 1);
                                          }


                                        }
                                        if(label.animationIndex == animationIndex){
                                            labelG.transition("fade in annotation")
                                                        .duration(500)
                                                        .attr("opacity", 1);
                                        }
                                        
                                    }

                                    return 0.1;
                                    }),
                          update => update.attr("transform", d => makeTranslate(d.x*scaleFactor,d.y*scaleFactor)),
                          exit => exit.remove());


}



var calculateZoomFactor = debounce(function (){
  var originalBoxWidth = renderedBox.node().getBBox().width;
  var clientBoxWidth = renderedBox.node().getBoundingClientRect().width;
  zoomFactor = originalBoxWidth/clientBoxWidth;
  resizeLabels();
},100);

function resizeLabels(){
  svg.selectAll(".label")
        .attr("font-size", function(d){
                  if(isMobile.matches) return d.textSize.mobile*zoomFactor +"px";
                  else return d.textSize.desktop*zoomFactor +"px";
        });


  svg.selectAll(".massacreAnnotation")
        .each(function(d){
          renderMassacreAnnotation(d3.select(this));
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

        //check for multiple
        if(!index.includes(" ")){
           updateChart[index]();
        } else {
          var indexes = index.split(" ");
          for(var i of indexes){
            updateChart[i]();
          }
        }


        
      }
    });
 }


//////discrete animations

var updateChart = {
  zoomOutFull: function(){
    animationIndex = 0;
    svg.selectAll(".chorti,.Wilmer,.Juan,.chuj,.Felipe").transition("fade out east labels backward")
                     .duration(500)
                     .attr("opacity", 0)
                     .on("end", function(){
                        if(animationIndex == 0){

                          svg.transition("Zoom out full!").duration(1500).attr("viewBox", `0 0 ${w} ${h}`)
                                      .on("end", function(){
                                          calculateZoomFactor();
                                      })
                        }
                      });
    
  },
  zoomChorti: function(){    
    animationIndex = 1;

    //fade out labels
    svg.selectAll(".qeqchi,.Jakelin").transition("fade labels out chorti")
                                           .duration(500)
                                           .attr("opacity", 0);

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
              //check if still at current step before fading in east labels
              if(animationIndex == 1){

                //fade in east labels
                svg.selectAll(".chorti,.Wilmer,.Juan").transition("fade in east labels")
                                           .duration(500)
                                           .attr("opacity", 1);
              }
            });

  },
  zoomQeqchi: function(){
      animationIndex = 2;

      var w2 = .40*w,
      h2 = 0.36*h,
      left = 0.38*w,
      top= 0.35*h;

      //fade out chorti labels
      svg.selectAll(".chorti,.Wilmer,.Juan,.achi,.Carlos").transition("fade out labels qeqchi")
               .duration(500)
               .attr("opacity", 0);
  
      //zoom to new location
      svg.transition("Zoom qeqchi").duration(1500).attr("viewBox", `${left} ${top} ${w2} ${h2}`)
                .on("end", function(){
                    calculateZoomFactor();
                    //fade in new labels
                    if(animationIndex == 2){
                        svg.selectAll(".Jakelin,.qeqchi").transition("fade in labels qeqchi")
                                .duration(500)
                                .attr("opacity", 1);
                    }

                });
                  
  },
  zoomAchi: function(){
    animationIndex = 3;

    var w2 = .30*w,
    h2 = 0.30*h,
    left = 0.28*w,
    top= 0.48*h;

    //fade out qeqchi labels
    svg.selectAll(".Jakelin,.qeqchi").transition("fade out labels achi")
             .duration(500)
             .attr("opacity", 0);

    //zoom to new location
    svg.transition("Zoom achi").duration(1500).attr("viewBox", `${left} ${top} ${w2} ${h2}`)
              .on("end", function(){
                  calculateZoomFactor();
                  //fade in new labels
                  if(animationIndex == 3){
                      svg.selectAll(".Carlos,.achi").transition("fade in labels achi")
                              .duration(500)
                              .attr("opacity", 1);
                  }

              });

  },
  zoomChuj: function(){
    animationIndex = 4;

    var w2 = .30*w,
    h2 = 0.30*h,
    left = 0.10*w,
    top= 0.28*h;

    //fade out achi labels
    svg.selectAll(".Carlos,.achi").transition("fade out labels chuj")
             .duration(500)
             .attr("opacity", 0);

    //zoom to new location
    svg.transition("Zoom chuj").duration(1500).attr("viewBox", `${left} ${top} ${w2} ${h2}`)
              .on("end", function(){
                  calculateZoomFactor();
                  //fade in new labels
                  if(animationIndex == 4){
                      svg.selectAll(".Felipe,.chuj").transition("fade in labels chuj")
                              .duration(500)
                              .attr("opacity", 1);
                  }

              });

  },
  fadeBinary: function(){
    //fade in binary
    svg.select(".binaryDot").transition("fadeInBinary")
          .duration(500)
          .attr("opacity", 1)
  },
  fadeAll: function(){
    //fade out binary
    svg.select(".binaryDot").transition("fadeOutBinary")
          .duration(500)
          .attr("opacity", 0)
  }
}

function renderDefendersData() {
    console.log(defendersData);
    // var defendersYear = 2019;

    var defenderScale = d3.scaleSqrt()
                  .domain([0,5])
                  .range([0, 8]);

    // var currentDefendersData = defendersData.filter(m => m[defendersYear]);

    var defenders = svgInner.selectAll(".defenderCircles")
                        .data(defendersData)
                        .enter()
                        .append("g")
                          .attr("transform", function(d){
                                var codigo = d.codigo_municipio;
                                var municipio = svg.select(`#m${codigo}`);
                                var centroid = pathGuate.centroid(municipio.datum());
                                return makeTranslate(centroid[0],centroid[1]);
                          })

                      var circles = defenders.append("circle")
                          .attr("r", d=>defenderScale(d.total))
                          .attr("stroke", "#fff")
                          .attr("stroke-width", 0.85)
                          .attr("fill", "#000")
                          .attr("fill-opacity", 0.8);

    // //add municipio code as text
    // defenders.append("text")
    //               .text(d=> d.codigo_municipio)
    //               .attr("fill", "#fff");



}




function renderMassacreAnnotation(labelG){

  //clear previous
  labelG.html("");

  var label = labelG.datum();
  var parent = d3.select(labelG.node().parentNode);

  var circleBbox = parent.select("circle").node().getBBox();

  var leaderLine = labelG.append("path");
  //add rectangle underneath text
  var textRect = labelG.append("rect");

  //calculate text dimensions
  var textElement = labelG.append("text")
    .attr("class", "label wrapped")
    .datum(label)
    .attr("fill", "#000")
    .style("font-family", "Lora")
    // .style("font-weight", "bold")
    // .attr("font-style", d=> d["font-style"] ? d["font-style"] : "normal")
    .attr("font-style", "italic")
    .attr("font-size", function(d){
          if(isMobile.matches) return d.textSize.mobile*zoomFactor +"px";
          else return d.textSize.desktop*zoomFactor +"px";
    })
    .attr("dominant-baseline", "hanging")
    .text(label["text"])
    .attr("text-shadow", "text-shadow: -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black;");



  var dWidth = isMobile.matches ? label["width"].mobile : label["width"].desktop;

  textElement.call(wrapText, dWidth, 12*zoomFactor);

  var textBbox = labelG.node().getBBox();
  var textW = textBbox["width"];
  var textH = textBbox["height"];

  //set x and y depending on where we want the text anchored
  labelG.attr("transform", function(d){
      var x,
      y;
      
      if(d.xAlign == "right"){
          x = circleBbox["width"]/2 + d.x;
      } else {
          x = d.x - circleBbox["width"]/2 - textW;
      }
      if(d.yAlign == "top"){
          y = circleBbox["height"]/2 + d.y;
      } else {
          y = d.y - circleBbox["height"]/2 - textH;
      }
      return makeTranslate(x,y);
  });


  var textPadding = 3;

  //add text rect
  textRect.attr("x", -textPadding)
          .attr("y",-textPadding)
          .attr("width", textW + textPadding*2)
          .attr("height", textH + textPadding*2)
          .attr("fill", "#fff")
          .attr("fill-opacity", 0.9)
          .attr("stroke", "none");

  //leader line dimensions
  leaderLine.attr("d", function(d){
                    if(d.xAlign == "right"){
                        var x0 = -circleBbox["width"]/2 - label.x;
                        var x1 = x0;
                        var x2 = -label.x/2;
                    } else {
                        var x0 = textW + circleBbox["width"]/2 -label.x;
                        var x1 = x0;
                        var x2 = textW - label.x/2;
                    }
                    if(d.yAlign == "top"){
                        var y0 = -circleBbox["height"]/2 -label.y;
                        var y1 = textH/2;
                        var y2 = y1;
                    } else {
                        var y0 = textH + circleBbox["height"]/2 -label.y;
                        var y1 = textH/2;
                        var y2 = y1;
                    }




                
                  return `M ${x0} ${y0}L ${x1} ${y1}L ${x2} ${y2}`;
                })
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.4)
            .attr("fill", "none");

    //don't add if double
    if(!label["second"]){
        console.log("adding title")
        //add name and date
        labelG.append("text")
                .attr("x", 0)
                .attr("y", -textPadding - 1)
                .attr("font-size", function(d){
                      if(isMobile.matches) return d.textSize.mobile*zoomFactor +"px";
                      else return d.textSize.desktop*zoomFactor +"px";
                })
                .attr("font-weight", "bold")
                .attr("fill", "#fff")
                .attr("text-shadow", "text-shadow: -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black;")
                .attr("dominant-baseline", "auto")
                .html(function(d){
                    return `<tspan x="0" dy="-1em" text-decoration="underline">${d.location} Massacre</tspan>
                            <tspan x="0" dy="1em">${d.date} — ${d.killed} ${d.victimType ? d.victimType : ""}killed</tspan>`;
                });
    }




}

//////////////////////////////////////////////////////////////////////
//////////////////Code for Continuous Animations///////////////////////////////
//////////////////////////////////////////////////////////////////////

var timeDomain = [new Date(1965,0,1), new Date(1969,11,31)];
var timeDomain2 = [new Date(1969,11,31), new Date(1978,4,31)];
var timeDomain3 = [new Date(1978,4,31), new Date(1982,2,31)];
var timeDomain4 = [new Date(1982,2,31), new Date(1982,11,31)];
var timeDomain5 = [new Date(1983,11,31), new Date(1995,11,31)];
var overallTimeDomain = [new Date(1965,0,1), new Date(1995,11,31)];


var timeScale = d3.scaleLinear()
                    .domain(timeDomain)
                    .range([0,1]);

var timeScale2 = d3.scaleLinear()
                    .domain(timeDomain2)
                    .range([0,1]);

var timeScale3 = d3.scaleLinear()
                    .domain(timeDomain3)
                    .range([0,1]);

var timeScale4 = d3.scaleLinear()
                    .domain(timeDomain4)
                    .range([0,1])

var timeScale5 = d3.scaleLinear()
                    .domain(timeDomain5)
                    .range([0,1])

var timeScaleOverall = d3.scaleLinear()
                    .domain(overallTimeDomain)
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

var currentDisplayTime = 1965;
var yearElement = d3.select("p.year");



function updateTime(){

  yearElement.text(currentDisplayTime);

  //update bars
  bars.attr("fill", function(d){
    var barYear = Number(d3.select(this).attr("class").substring(3));
    var currentYear = Number(currentDisplayTime.substring(currentDisplayTime.length - 4));
    if(barYear<currentYear){
      return "#ccc";
    } else if(barYear==currentYear){
      return "#fff";
    } else {
      return "#000";
    }
    });


    //update line
    timeIndicator.attr("stroke-dashoffset", function(d){
      var length = d3.select(this).node().getTotalLength();
      return length*(1-overallTimePercent);
    });
}

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
  overallTimePercent = timeScaleOverall(newTime);


  if(newDisplayTime != currentDisplayTime){
    //update year text
    currentDisplayTime = newDisplayTime;
    updateTime();

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
  overallTimePercent = timeScaleOverall(newTime);


  if(newDisplayTime != currentDisplayTime){
    //update year text
    currentDisplayTime = newDisplayTime
    updateTime();
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
  overallTimePercent = timeScaleOverall(newTime);


  if(newDisplayTime != currentDisplayTime){
    //update year text
    currentDisplayTime = newDisplayTime
    updateTime();
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
    listening3 = true;
  } else {
    window.removeEventListener("scroll", onScroll3);
    listening3 = false;
  }
}

////////////////////////////////////////////

let observer4 = new IntersectionObserver(intersectionCallback4, observerOptions);
var target4 = d3.select(".time4").node();
observer4.observe(target4);


function onScroll4(){
  latestKnownTop4 = target4.getBoundingClientRect().top;
  requestTick4();
}

var ticking4 = false;

function requestTick4(){
  if(!ticking4){
      requestAnimationFrame(update4);
  }
  ticking4 = true;
}

function update4(){
    //reset tick to capture next scroll
  ticking4 = false;
  
  var currentTop = latestKnownTop4;
  var percent = (window.innerHeight - currentTop)/ window.innerHeight;
  if(percent>1) percent = 1;
  if(percent<0) percent = 0;

  var newTime = timeScale4.invert(percent);

  var newDisplayTime = fmtMonthYear(newTime);
  var timePeriod = fmtMonthYearNum(newTime);
  overallTimePercent = timeScaleOverall(newTime);


  if(newDisplayTime != currentDisplayTime){
    //update year text
    currentDisplayTime = newDisplayTime
    updateTime();
    //update massacres
    var currentData = massacresSpread.municipios.filter(m => m.mama[timePeriod]);
    updateMassacres(currentData,timePeriod);

  }

}

var listening4;

function intersectionCallback4(entries, observer){
  if(entries[0].intersectionRatio>0){
    if(!listening4) {
      window.addEventListener("scroll",onScroll4);
    }
    listening4 = true;
  } else {
    window.removeEventListener("scroll", onScroll4);
    listening4 = false;
  }
}

////////////////////////////////////////////

let observer5 = new IntersectionObserver(intersectionCallback5, observerOptions);
var target5 = d3.select(".time5").node();
observer5.observe(target5);


function onScroll5(){
  latestKnownTop5 = target5.getBoundingClientRect().top;
  requestTick5();
}

var ticking5 = false;

function requestTick5(){
  if(!ticking5){
      requestAnimationFrame(update5);
  }
  ticking5 = true;
}

function update5(){
    //reset tick to capture next scroll
  ticking5 = false;
  
  var currentTop = latestKnownTop5;
  var percent = (window.innerHeight - currentTop)/ window.innerHeight;
  if(percent>1) percent = 1;
  if(percent<0) percent = 0;

  var newTime = timeScale5.invert(percent);

  var newDisplayTime = fmtMonthYear(newTime);
  var timePeriod = fmtMonthYearNum(newTime);
  overallTimePercent = timeScaleOverall(newTime);


  if(newDisplayTime != currentDisplayTime){
    //update year text
    currentDisplayTime = newDisplayTime
    updateTime();
    //update massacres
    var currentData = massacresSpread.municipios.filter(m => m.mama[timePeriod]);
    updateMassacres(currentData,timePeriod);

  }

}

var listening5;

function intersectionCallback5(entries, observer){
  if(entries[0].intersectionRatio>0){
    if(!listening5) {
      window.addEventListener("scroll",onScroll5);
    }
    listening5 = true;
  } else {
    window.removeEventListener("scroll", onScroll5);
    listening5 = false;
  }
}



////Helpers////////////////////////////////
///////////////////////////////////////////////////////////////

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

////
var isMobile = window.matchMedia("(max-width: 500px)"),
  isTablet = window.matchMedia("(max-width:750px)"),
  isDesktop = window.matchMedia("(min-width: 501px)");


/////
var wrapText = function (texts, width, lineHeight) {

  var eachText = function(text) {
    // work with arrays as well
    var words = text.textContent.split(/\s+/).reverse();

    var word = null;
    var line = [];
    var lineNumber = 0;

    var x = text.getAttribute("x") || 0;
    var y = text.getAttribute("y") || 0;

    var dx = parseFloat(text.getAttribute("dx")) || 0;
    var dy = parseFloat(text.getAttribute("dy")) || 0;

    text.textContent = "";

    var NS = "http://www.w3.org/2000/svg";
    var tspan = document.createElementNS(NS, "tspan");
    text.appendChild(tspan);

    var attrs = { x, y, dx: dx + "px", dy: dy + "px" };
    for (var k in attrs) {
      tspan.setAttribute(k, attrs[k]);
    }

    while (word = words.pop()) {
      line.push(word);
      tspan.textContent = line.join(" ");

      if (tspan.getComputedTextLength() > width) {
        line.pop();
        tspan.textContent = line.join(" ");
        line = [word];

        lineNumber += 1;

        tspan = document.createElementNS(NS, "tspan");
        text.appendChild(tspan);

        var attrs = { x, y, dx: dx + "px", dy: (lineNumber * lineHeight) + dy + "px" };
        for (var k in attrs) {
          tspan.setAttribute(k, attrs[k]);
        }
        tspan.textContent = word;
      }
    }
  };

  // convert D3 to array
  if ("each" in texts) {
    // call D3-style
    texts = texts.nodes();
  } 
  texts.forEach(eachText);
};

var makeTranslate = (x, y) => `translate(${x}, ${y})`;

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");



loadData();
