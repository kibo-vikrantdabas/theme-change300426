define(["modules/jquery-mozu", "modules/backbone-mozu", "hyprlive", "modules/api", "underscore", "hyprlivecontext"], 
    function ($, Backbone, Hypr, api, _, HyprLiveContext) {

        const Location = Backbone.MozuModel.extend({
            mozuType: 'location',
            idAttribute: 'code'
        });

        const LocationCollection = Backbone.MozuModel.extend({
            mozuType: 'locations',
            relations: {
                items: Backbone.Collection.extend({
                    model: Location
                })
            }
        });

        const StoreFinder = Backbone.MozuModel.extend({
            relations: {
                locations: LocationCollection
            },
            initialize: function() {
                const self = this;

                self.set('activeDisplay', "list");
                self.set('isHrsActive', false); 
                self.set('isDptActive', false);
                self.set('searchInput', '');
                self.set('zeroNearbyLocations', false);
                self.set('showLocations', true);
                if(!sessionStorage.getItem('userSelectedLocation')){
                    // self.setDefaultLocation();
                }
                window.currentGeo = JSON.parse(sessionStorage.getItem('geo'));
                if(require.mozuData('pagecontext').cmsContext){
                var pageType = require.mozuData('pagecontext').cmsContext.template.path;
                if(pageType === "cart" || pageType ==="location"){
                if(_.isUndefined(window.currentGeo) || _.isNull(window.currentGeo)){
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(function (geo) {
                            self.set('currentGeo', geo);
                            if(!window.currentGeo){
                                window.currentGeo = geo;
                            }
                                
                            if(self.get('locations')) {
                                self.get('locations').apiGet().then(function(resp) { 
                                    self.setLocationsByDistance(self.get('locations').get('items'));
                                });
                            }
                        }, function (err) {
                            //self.model.populate();
                            if(self.get('locations')) {
                                self.get('locations').apiGet().then(function(resp) {
                                    self.get('locations').get('items').forEach(function(loc, i) {
                                        loc.set('index', i + 1);
                                    });
                                });
                            }
                        }, {
                            timeout: 10000
                        });
                    }
                } else {
                    self.set('currentGeo', window.currentGeo);
                    if(window.cartView){
                        this.getLocations();
                    }
                 }
                }
             }
            },
            setDefaultLocation: function(){
                var self = this;
                var defaultLocationCode = HyprLiveContext.locals.themeSettings.defaultCNCLocationCode || {coords: {latitude: 25.223893, longitude: 55.351079}};
                var location = new Location();
                location.apiGet({code: defaultLocationCode}).then(function(res){
                    var locData = res.data;
                    var name = locData.name;
                    var geo = locData.geo;
                    self.set('defaultLocation', name);
                    self.set('selectedLocation', name);
                    self.set('nearestLocation', name);
                    window.storeGeo = {coords: {latitude: geo.lat, longitude: geo.lng}};
                }).catch(function(e){
                    self.set('defaultLocation', "M&S, Dubai Festival City");
                    self.set('selectedLocation', "M&S, Dubai Festival City");
                    self.set('nearestLocation', "M&S, Dubai Festival City");
                    window.storeGeo = {coords: {latitude: 25.223893, longitude: 55.351079}};
                });
            },
            handleZeroLocations: function(coords){
                var self = this;
                self.get('locations').apiGet().then(function(res){
                    self.setZeroNearbyLocations(true);
                    self.setLocationsByDistance(self.get('locations').get('items'), coords);
                });
            },
            getLocations: function(){
                var self = this;
                if(self.get('locationStore')){
                    self.get('locations').set('items', self.get('locationStore'));
                    if(window.cartView){
                        window.cartView.locationView.updateMarkers();
                    } else {
                        window.locationView.updateMarkers();
                    }
                } else {
                    if(self.get('locations')){
                        self.get('locations').apiGet().then(function(resp) {
                            self.setLocationsByDistance(self.get('locations').get('items'));
                        });
                    }
                }
            },
            setActiveDisplay: function(input){
                this.set('activeDisplay', input);
            },
            setShowLocations: function(bool){
                this.set('showLocations', bool);
            },
            setLocationHasBeenSearched: function(bool){
                this.set('locationHasBeenSearched', bool);
            },
            setCurrentLocationSearch: function(bool){
                this.set('currentLocationSearch', bool);
            },
            setZeroNearbyLocations: function(bool){
                this.set('zeroNearbyLocations', bool);
            },
            setActiveDropdown: function(input){
                this.set('activeDropdown', input);
            },
            setActiveDropdownStore: function(input) {
                this.set('activeDropdownStore', input);
            },
            setSearchInput: function(input){
                this.set('searchInput', input);
            },
            setSelectedLocation: function(input) {
                this.set('selectedLocation', input);
            },
            setSelectedLocationCoords: function(input){
                this.set('selectedLocationCoords', input);
            },
            setLocationsHaveBeenFiltered: function(bool){
                this.set('locationsHaveBeenFiltered', bool);
            },
            setScrollPosition: function(input){
                this.set('scrollPosition', input);
            },
            toggleHrsDropdown: function(bool){
                this.set('isHrsActive', bool);
            },
            toggleDptDropdown: function(bool){
                this.set('isDptActive', bool);
            },
            triggerCartModalIsReady: function() {
                if(window.cartView){
                    window.cartView.cartView.model.set('isModalReady', true);
                }
            },
            setLocationsByDistance: function(locations, coords) {
                const self = this;
                var geo; 
                if(coords){
                    geo = coords;
                } else{
                    geo = window.currentGeo.coords;    
                }

                locations.forEach(function(loc, i) {
                    self.setCondensedHours(loc.get('regularHours'), loc);
                    var approxDistance = self.getApproxDistFromCurrent(geo.latitude, geo.longitude, loc.get('geo').lat, loc.get('geo').lng);
                    loc.set('approxDistance', approxDistance);
                });

                var sortedByDistance = self.get('locations').get('items').models.sort(function(loc1, loc2) {
                    return loc1.get('approxDistance') - loc2.get('approxDistance');
                });

                sortedByDistance = sortedByDistance.filter(function(value){
                    return value.get("address").countryCode == Hypr.getThemeSetting('countrySpecificCode');
                });

                sortedByDistance.forEach(function(loc, i){
                    loc.set('index', i + 1);
                });
                //if first time, store locations in a cache for reset
                if(!self.get('locationStore')){
                    self.set('locationStore', sortedByDistance);
                }
                self.get('locations').set('items', sortedByDistance);
                self.setLocationsHaveBeenFiltered(true);
                self.trigger('locationUpdate');
                self.triggerCartModalIsReady();
                
                if(window.cartView){
                    window.cartView.locationView.updateMarkers();
                } else {
                    window.locationView.updateMarkers();
                }

            },
            getApproxDistFromCurrent: function(lat1, lon1, lat2, lon2){
                function deg2rad(deg) {
                    return deg * (Math.PI/180);
                }
                var R = 6371; // Radius of the earth in km
                var dLat = deg2rad(lat2-lat1);  // deg2rad below
                var dLon = deg2rad(lon2-lon1); 
                var a = 
                    Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
                    Math.sin(dLon/2) * Math.sin(dLon/2)
                    ; 
                var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
                var d = R * c; // Distance in km
                if(d > 100){
                    return Number(Math.round(d));
                } else{
                    return Number.parseFloat(d).toFixed(1);      
                }
            },
            setCondensedHours: function(hours, locModel) {
                //get differing store hours and remove time zone from response, either 
                if(hours.timeZone) delete hours.timeZone;
                var daysIterator = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
                var startDay = 0;
                var nextDay = 0;
                var condensedHours = [];
            
                var abbrvDay = function(day){
                    var dayMapper = {'monday': 'Mon', 'tuesday': 'Tue', 'wednesday': 'Wed', 'thursday': 'Thur', 'friday':'Fri', 'saturday': 'Sat', 'sunday': 'Sun'};
                    return dayMapper[day];
                };
                
                while(nextDay < daysIterator.length){
                    var startDayName = daysIterator[startDay];
                    var nextDayName = daysIterator[nextDay];
            
                    var startDayHours = hours[daysIterator[startDay]];
                    var nextDayHours = hours[daysIterator[nextDay]];
            
                    if(startDayHours.label === nextDayHours.label){
                        nextDay++;
                    } else {
                        var hrs = {};
                        nextDayName = daysIterator[nextDay - 1];
            
                        if(startDay + 1 === nextDay){
                            hrs.days = abbrvDay(startDayName);
                        } else {
                            hrs.days = abbrvDay(startDayName) +  "-" + abbrvDay(nextDayName);
                        }
                        if(startDayHours.label){
                            hrs.hrs = startDayHours.label.replace(/:00\s*/g, "").replace(/[-]/g, " - ");
                        } 
                        condensedHours.push(hrs);
                        startDay = nextDay;
                        nextDay = startDay + 1;
                    }      
                }
                //account for final grouping of hours
                var lastDayName = daysIterator[startDay];
                var lastNextDayName = daysIterator[nextDay - 1];
                var lastStartDayHours = hours[daysIterator[startDay]];
                var lastHrs = {};

                if(lastDayName === lastNextDayName){
                    lastHrs.days = abbrvDay(lastDayName);
                } else {
                    lastHrs.days = abbrvDay(lastDayName) +  "-" + abbrvDay(lastNextDayName);
                }
                if(lastStartDayHours.label){
                    lastHrs.hrs = lastStartDayHours.label.replace(/:00\s*/g, "").replace(/[-]/g, " - ");
                }
            
                condensedHours.push(lastHrs);

                locModel.set('condensedHours', condensedHours);
            },
            getLocationCode: function(name){
                var code;
                this.get('locations').get('items').models.forEach(function(obj){
                    if(obj.get('name') === name){
                        code = obj.get('code');
                    }
                });
                return code;
            }
        });

        return {
            Location: Location,
            LocationCollection: LocationCollection,
            StoreFinder: StoreFinder
        };
    }
);





