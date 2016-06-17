$(document).ready(function () {
	//Show Map
	findPolygons().done(function(data){
	  var initialCoord = data.polygonGroup[0].latLng[0];
	  showMap(initialCoord, "mapContainer");
	  //console.log(data);
	  showPolygons(data);

	}).fail(function(){
	  alert("error!");
	});
});