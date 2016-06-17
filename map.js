var map;
var gpolygons = [];

function showMap(coordinates, elementId) { 
  var mapDiv = document.getElementById(elementId);   
  var latlng = new google.maps.LatLng(coordinates.lat, coordinates.lng); 

  var mapOptions = {
        zoom: 12,
        center: latlng,               
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };    
    
    map = new google.maps.Map(mapDiv, mapOptions);
}

function findPolygons(){
   var deferred =  $.Deferred();
   var url = 'coordinates.json';    
  
    $.getJSON(url, function(data){ 
           deferred.resolve(data);
    }, function (error) {
        deferred.reject();
    });

    return deferred.promise();
}

//Show polygons groun in map... polygons not editable
function showPolygons(data){ 
    $.each(data.polygonGroup, function (key, value) {                   
        var polygon = [value.latLng];               
        drawPolygon(polygon[0], value.color, false, value.polygonId);        
    });
}

// Construct the polygon. 
function drawPolygon(coordinates, color, editable, polygonId){  
  var polygon = new google.maps.Polygon({
    paths: coordinates,
    strokeColor: color,
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: color,
    fillOpacity: 0.35,
    editable: editable, //true or false
    _uniqueId: polygonId
  });
  polygon.setMap(map);

  gpolygons.push(polygon);
  changePolygon(polygon); 
}

//When you click in polygon, you can edit
function changePolygon(polygon){
    google.maps.event.addListener(polygon, 'click', function (event) { 
        //turn as editable polygon
        polygon.setEditable(true);

        var polygonPath      = polygon.getPath();

        //Check if initial and final coordinates are the same
        var polygonLenght    = polygonPath.j.length-1; console.log(polygonLenght);
        var initialLatitude  = polygonPath.getAt(0).lat();
        var initialLongitude = polygonPath.getAt(0).lng();
        var finalLatitude    = polygonPath.getAt(polygonLenght).lat();
        var finalLongitude   = polygonPath.getAt(polygonLenght).lng();

       if(initialLatitude == finalLatitude && initialLongitude == finalLongitude){
            //the user can add new vertex in polygon
            addVertex(polygon);

            //the user can edit a existent vertex
            modifyVertex(polygon);
        }else{
         console.log("Initial Latitude", initialLatitude);
         console.log("Final Latitude", finalLatitude);
       }
    });
}

function addVertex(polygon){
    google.maps.event.addListener(polygon.getPath(), 'insert_at', function(index, obj) { 
        modifyPolygon(polygon);
    });
}

function modifyVertex(polygon){
    google.maps.event.addListener(polygon.getPath(), 'set_at', function(index, obj) { 
        
         modifyPolygon(polygon);
       
    });
}

function modifyPolygon(polygon){
    var polygonPath     = polygon.getPath();
    var geometryFactory = new jsts.geom.GeometryFactory();
    var polyCoor        = googleMaps2JTS(polygonPath); 
    var shell           = geometryFactory.createLinearRing(polyCoor); 
    var jstsPolygon     = geometryFactory.createPolygon(shell);
    var count           = 0; //this will count if the polygon has intersection
    var difference      = false;

    //Check if any polygon has intersection 
    for(i=0; i < gpolygons.length; i++){  
        if(i==0){
            console.log("Polygon: ", i);
            difference = findIntersection(polygon, gpolygons[0], jstsPolygon, geometryFactory);
            count = 1;
        }else if(i>0 && difference == false){
            console.log("Polygon: ", i);
            difference = findIntersection(polygon, gpolygons[i], jstsPolygon, geometryFactory);
            count++;
        }else if(i>0 && difference != false){
            console.log("Polygon: ", i);
            difference = findIntersection(polygon, gpolygons[i], difference, geometryFactory);
        }
        
        console.log("count", count);

        if(count == gpolygons.length){
            console.log("polygon Alone");
        }
    }
}

function findIntersection(polygon, polygonIntersection, jstsPolygon, geometryFactory){
  
    var otherPolyPath = polygonIntersection.getPath();
    var otherPolyCoor = googleMaps2JTS(otherPolyPath);
    var otherShell    = geometryFactory.createLinearRing(otherPolyCoor);
    var jstsPolygon2  = geometryFactory.createPolygon(otherShell);
    var intersection  = jstsPolygon2.intersects(jstsPolygon);
    var difference    = jstsPolygon.difference(jstsPolygon2); 
    var conversionJstsGoogle = jsts2googleMaps(difference);

    //if has intersection and old polygon is different the new polygon return difference
    if(intersection==true && polygon._uniqueId != polygonIntersection._uniqueId){
        //remove old polygon
        for(x=0; x<gpolygons.length; x++){
            if(gpolygons[x]._uniqueId == polygon._uniqueId){
                gpolygons[x].setMap(null);
                gpolygons.splice(x, 1); 
            }
        }

        //create a new polygon
        drawPolygon(conversionJstsGoogle, polygon.fillColor, false, polygon._uniqueId);

        return difference;
    }else{
        return false;
    }
}
//Convert google coordinates to jsts coordinates
function googleMaps2JTS(boundaries) {
  var coordinates = [];
  for (var i = 0; i < boundaries.getLength(); i++) {
  coordinates.push(new jsts.geom.Coordinate(
    boundaries.getAt(i).lat(), boundaries.getAt(i).lng()));
  }
  return coordinates;
}

//Convert jsts coordinates to google coordinates
function jsts2googleMaps(geometry) {
  var coordArray = geometry.getCoordinates();
  GMcoords = [];
  for (var i = 0; i < coordArray.length; i++) {
  GMcoords.push(new google.maps.LatLng(coordArray[i].x, coordArray[i].y));
  }
  return GMcoords;
}