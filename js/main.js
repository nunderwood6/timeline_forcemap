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


function loadData(){
    Promise.all([
      d3.json("data/municipios_topo.json"),
      d3.json("data/focusArea_extent.geojson"),
      d3.json("data/raster_extent.geojson"),
      d3.json("data/countries_topo.json"),
      d3.json("data/circle_positions.json"),
      d3.json("data/home_points.geojson"),
      d3.json("data/departamentos_topo.json"),
      d3.json("data/yearly_totals.json")
    ])
    .then(function([municipiosTOPO,focusAreaJSON,rasterAreaJSON,countriesTOPO,circlePositionsJSON,homesJSON,departamentosTOPO,yearlyTotalsJSON]){

        var municipios = topojson.feature(municipiosTOPO, municipiosTOPO.objects.municipios).features;
        var departamentos = topojson.feature(departamentosTOPO,departamentosTOPO.objects.departamentos).features;
        var focusBox = focusAreaJSON;
        var rasterBox = rasterAreaJSON;
        var countries = topojson.feature(countriesTOPO, countriesTOPO.objects.countries).features;
        var homes = homesJSON.features;
        massacresSpread = circlePositionsJSON;
        yearlyTotals = yearlyTotalsJSON;

        positionMap(municipios,focusBox,rasterBox,countries);
        // drawMunicipios(municipios,departamentos);
        drawHomes(homes);
        drawMassacres();
        addDiscreteListeners();
        // addLabels();
        renderMassacreChart();

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
                            .attr("stroke-width", 0.25);

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
      // {"text": "Lago de Izabal",
      //   "x": ".76",
      //   "y": ".57",
      //   "textSize": 11,
      //   "font-style": "italic",
      //   "fill": "#aaa",
      // },
      {"text": "Ch'orti' Territory",
        "x": ".72",
        "y": ".735",
        "textSize": {mobile:14,
                    desktop:16},
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
                              .attr("class", d=> d.caso ? ("innerChildren c"+ d.caso) : ("innerChildren c"+ d.caso_ilustrativo))
                              .attr("transform", d => makeTranslate(d.x*scaleFactor,d.y*scaleFactor))
                                   .append("circle")
                                   .attr("r", d=>(d.r-0.1)*scaleFactor)
                                   .attr("fill-opacity", 0.9)
                                   .attr("fill", "#fff")
                                   .attr("stroke", "#555")
                                   .attr("stroke-width", 0.1),
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

  // svg.selectAll("text.label.wrapped")
  //       .text(d=>d["text"])
  //       .each(function(d){
  //             console.log(d["text"]);
  //             var fontSize = isMobile.matches ? d.textSize.mobile*zoomFactor : d.textSize.desktop*zoomFactor;
  //             d3.select(this).call(wrapText,d["width"], fontSize);
  //       });

          
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
  zoomOutFull: function(){
    animationIndex = 0;
    svg.selectAll(".eastLabel,.Wilmer,.Juan").transition("fade out east labels backward")
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
  zoomToEast: function(){    
    animationIndex = 1;

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
                svg.selectAll(".eastLabel,.Wilmer,.Juan").transition("fade in east labels")
                                           .duration(500)
                                           .attr("opacity", 1);
              }
            });

  },
  cajonDelRio: function(){
    animationIndex = 2;

    var labels = [
      {"case": "c47",
       "date": "February 7, 1967",
       "name": "Cajón del Río Massacre",
       "x": 0,
       "y": 0,
       "textSize": {mobile:11,desktop:12},
       "width": 52,
       "xAlign": "right",
       "yAlign": "top",
       "text": "“Many from here are [still] in Honduras. Almost half of the village left.” —Survivor"
      },
      {"case": "c1004",
       "x": 0,
       "y": 0,
       "textSize": {mobile:11,desktop:12},
       "width": 60,
       "xAlign": "left",
       "yAlign": "bottom",
       "text": "The soldiers doused them with gasoline and began to throw paper balls at them with fire. The victims were burned alive. —CEH"
      }
    ];


    // append labels to the massacre circle groups
    for(var label of labels){
        
        var labelG = d3.select(`g.${label.case}`);
        var circleBbox = labelG.select("circle").node().getBBox();
        console.log(circleBbox);

        var textG = labelG.append("g").attr("opacity", 0).datum(label);
        var textRect = textG.append("rect");

        //calculate text dimensions
        var textElement = textG.append("text")
          .attr("class", "label wrapped")
          .datum(label)
          .attr("fill", "#fff")
          .style("font-family", "Lora")
          .style("font-weight", "bold")
          .attr("font-size", function(d){
                if(isMobile.matches) return d.textSize.mobile*zoomFactor +"px";
                else return d.textSize.desktop*zoomFactor +"px";
          })
          // .attr("dominant-baseline", d=> (d.yAlign == "top") ? "auto" : "hanging")
          .attr("dominant-baseline", "hanging")
          .text(label["text"])

        textElement.call(wrapText, label["width"], 12*zoomFactor);

        var textBbox = textG.node().getBBox();
        var textW = textBbox["width"];
        var textH = textBbox["height"];

        //set x and y depending on where we want the text anchored
        textG.attr("transform", function(d){
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

        //add text rect
        textRect.attr("x", 0)
                .attr("y",0)
                .attr("width", textW)
                .attr("height", textH)
                .attr("fill", "#000");

        textG.transition("fade in cajon labels")
          .duration(500)
          .attr("opacity", 1);



        
    }



    // labels.selectAll(".eastLabel")
    //       .data(eastLabels)
    //       .enter()
    //       .append("text")
    //           .attr("class", "label eastLabel")
    //           .attr("x", d=>d.x*w)
    //           .attr("y", d=>d.y*h)
    //           .attr("font-size", function(d){
    //               if(isMobile.matches) return d.textSize.mobile*zoomFactor +"px";
    //               else return d.textSize.desktop*zoomFactor +"px";
    //           })
    //           .attr("font-style", d=> d["font-style"] ? d["font-style"] : "normal")
    //           .attr("fill", d => d.fill)
    //           .attr("text-anchor", "middle")
    //           .attr("letter-spacing", d=> d["letter-spacing"] ? d["letter-spacing"] : "normal")
    //           .attr("font-weight", d=> d["font-weight"] ? d["font-weight"] : "normal")
    //           .attr("opacity", 0)
    //           .attr("text-shadow", "2px 2px 1px black;")
    //           .attr("style","white-space:pre")
    //           .text(d=>d["text"]);





  },
  zoomToPanzos: function(){
      animationIndex = 3;
      var w2 = .40*w,
      h2 = 0.36*h,
      left = 0.38*w,
      top= 0.35*h;

      //zoom out old labels
      svg.selectAll(".eastLabel,.Wilmer,.Juan").transition("fade out east labels forward")
               .duration(500)
               .attr("opacity", 0)
               .on("end", function(){
                  if(animationIndex = 3){
                      //zoom to new location
                      svg.transition("Zoom panzos").duration(1500).attr("viewBox", `${left} ${top} ${w2} ${h2}`)
                                .on("end", function(){
                                    calculateZoomFactor();

                                });
                  }
  
                })


  }
}

//////////////////////////////////////////////////////////////////////
//////////////////Code for Continuous Animations///////////////////////////////
//////////////////////////////////////////////////////////////////////

var timeDomain = [new Date(1965,0,1), new Date(1969,11,31)];
var timeDomain2 = [new Date(1970,0,1), new Date(1979,11,31)];
var timeDomain3 = [new Date(1980,0,1), new Date(1995,11,31)];
var timeDomain4 = [new Date(1983,0,1), new Date(1995,11,31)];
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
    listening2 = true;
  } else {
    window.removeEventListener("scroll", onScroll3);
    listening2 = false;
  }
}



////Helpers/////////////////////

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
