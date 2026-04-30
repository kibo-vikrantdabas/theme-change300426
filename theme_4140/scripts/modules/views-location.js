define(['modules/jquery-mozu', 'hyprlive', 'modules/backbone-mozu', 'modules/models-location', 'modules/models-product', 'modules/preserve-element-through-render',
    'hyprlivecontext', 'modules/modal-dialog', 'underscore', 'modules/analytics/location-gtm','modules/api'],
    function ($, Hypr, Backbone, LocationModels, ProductModels, preserveElements, HyprLiveContext, ModalDialog, _ , locationGTM,api) {

        const positionErrorLabel = Hypr.getLabel('positionError'),

            StoreFinder = Backbone.MozuView.extend({
                templateName: 'modules/location/store-finder',
                additionalEvents:{
                "click .mz-openingtime-title": "openingTimeValidation",
                "click .mz-department-title": "departmentValidation",
                "click .mz-locationlisting-title": "locationlistValidation"
                },
                openingTimeValidation: function(e){
                    if($(e.currentTarget).hasClass('deactive')) {
                        $('.mz-openingtime-title')
                            .addClass('active')
                            .removeClass('deactive');
                        $('.mz-openingtime-details')
                            .addClass('active')
                            .removeClass('deactive');
                    }
                    else {
                            $('.mz-openingtime-title')
                            .addClass('deactive')
                            .removeClass('active');
                            $('.mz-openingtime-details')
                            .addClass('deactive')
                            .removeClass('active');
                    }
                },
                departmentValidation: function(e){
                    if($(e.currentTarget).hasClass('deactive')) {
                        $('.mz-department-title')
                            .addClass('active')
                            .removeClass('deactive');
                        $('.mz-location-departments')
                            .addClass('active')
                            .removeClass('deactive');
                    }
                    else {
                            $('.mz-department-title')
                            .addClass('deactive')
                            .removeClass('active');
                            $('.mz-location-departments')
                            .addClass('deactive')
                            .removeClass('active');
                    }
                },
                locationlistValidation: function (){
                    $.map($('.mz-locationlisting-title'), function(value,index){
                            if($(value).hasClass('deactive')){
                                $('.mz-locationlisting-title').eq(index)
                                .addClass('active')
                                .removeClass('deactive');
                            }else{
                                $('.mz-locationlisting-title').eq(index)
                                .addClass('deactive')
                                .removeClass('active');
                            }
                    });
                },
                eventHandler: function(e) {
                    this.render();
                },

                searchByInputLocation: function() {
                    var searchInput = $('.town-street-name')[0].value.trim();
                    this.model.setLocationsHaveBeenFiltered(false);
                    this.model.setSearchInput(searchInput);
                    this.model.setShowLocations(false);
                    if(searchInput === ''){
                        this.model.setShowLocations(true);
                        this.model.setLocationHasBeenSearched(true);
                        if(!window.cartView){
                            this.model.get('locations').set('items', []);
                        }
                        this.getCurrentLocation();
                        return; 
                    }
                    this.model.setLocationHasBeenSearched(true);
                    this.model.setCurrentLocationSearch(false);
                    this.model.setZeroNearbyLocations(false);
                    this.model.get('locations').set('items', []);
                    this.geoCodeLocation({address: searchInput}, searchInput);

                    try {
                         locationGTM.userSearchedLocation(searchInput);
                    } catch (error) {
                      console.log('Error Occured While Firing Event', error.message);  
                    }
                },
                geoCodeLocation: function(locInput, searchInput){
                    var self = this;
                    var geocoder = self.model.geocoder;
                    if(geocoder){
                        geocoder.geocode(locInput).then(function(res){
                            var locResults = res.results[0];
                            var formattedAddress = locResults.formatted_address;
                            var lat, lng;
                            if(locResults.geometry.location){
                                lat = locResults.geometry.location.lat();
                                lng = locResults.geometry.location.lng();
                            } else {
                                var geo = self.model.get('currentGeo').coords;
                                lat = geo.latitude;
                                lng = geo.longitude;
                            }
                            var sortByGeoRequest = 'geo near('+ lat+ ',' + lng + ', 100000)';
                            self.model.map.setCenter({lat: lat, lng: lng});
                            self.model.setSearchInput(formattedAddress);                            
                            if (window.cartView) {
                                self.model.get('locations').apiGet({ filter: sortByGeoRequest }).then(function (res) {
                                    var locations = self.model.get('locations').get('items');
                                    self.model.setShowLocations(true);
                                    var coords = {
                                        latitude: lat,
                                        longitude: lng
                                    };
                                    if (locations.length === 0) {
                                        if (window.cartView) {
                                            self.model.handleZeroLocations(coords);
                                        }
                                        self.render();
                                    } else {
                                        self.model.setZeroNearbyLocations(false);
                                        self.model.setLocationsByDistance(locations, coords);
                                        self.updateMarkers();
                                    }
                                }).catch(function (e) {
                                    console.log('error updating api', e);
                                });
                            } else {
                                var countryCode = Hypr.getThemeSetting('countrySpecificCode');
                                var requestUrl = "/getLocations?filter=" + sortByGeoRequest + ' and countryCode eq '+ countryCode;
                                api.request("GET", requestUrl).then(function (res) {
                                    if(res && res.items) {
                                        self.model.get('locations').set('items',res.items);
                                    }
                                    var locations = self.model.get('locations').get('items');
                                    self.model.setShowLocations(true);
                                    var coords = {
                                        latitude: lat,
                                        longitude: lng
                                    };
                                    if (locations.length === 0) {
                                        self.render();
                                    } else {
                                        self.model.setZeroNearbyLocations(false);
                                        self.model.setLocationsByDistance(locations, coords);
                                        self.updateMarkers();
                                    }
                                }).catch(function (e) {
                                    console.log('error updating api', e);
                                });
                            }
                        })
                        .catch(function (e){
                            console.log('error with Geolocation', e);
                            self.model.setShowLocations(true);
                            self.model.setSearchInput(searchInput.trim());
                            if(window.cartView){
                                self.model.handleZeroLocations();
                            } else {
                                self.render();
                            }
                        });

                    } 

                },
                getCurrentLocation: function() {
                    var self = this;
                    var geo = self.model.get('currentGeo').coords;
                    this.model.setLocationsHaveBeenFiltered(false);
                    this.model.setLocationHasBeenSearched(true);
                    this.model.setCurrentLocationSearch(true);
                    this.geoCodeLocation({location: {lat: geo.latitude, lng:geo.longitude}});
                    try {
                        locationGTM.useUserCurrentLocation();
                    } catch (error) {
                        console.log('Error Occured While Triggering Current Location Event', error.message);
                    }
                },
              getGeo: function () {
    const self = this;

    var pageContext = require.mozuData('pagecontext');
    var templatePath = '';
    if (
        pageContext &&
        pageContext.cmsContext &&
        pageContext.cmsContext.template &&
        pageContext.cmsContext.template.path
    ) {
        templatePath = pageContext.cmsContext.template.path;
    }

    if (templatePath === "cart" || templatePath === "location") {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (geo) {
                self.model.set('currentGeo', geo);
                self.model.trigger('currentGeo', geo);
            }, function (err) {
                self.createMap();
                self.updateMarkers();
            }, {
                timeout: 10000
            });
        }
    }
},
                initialize: function () {
                    const self = this;
                    
                    const locationsCollection = this.model.get('locations').get('items');
                    //this.listenTo(locationsCollection, 'all', self.eventHandler, self);
                    this.listenTo(self.model, 'currentGeo', this.createMap);
                    this.listenTo(self.model, 'change:isHrsActive', this.render);
                    this.listenTo(self.model, 'change:isDptActive', this.render);
                    this.listenTo(self.model, 'change:activeDisplay', this.render);
                    this.listenTo(self.model, 'change:activeDropdown', this.render);
                    this.listenTo(self.model, 'change:searchInput', this.render);
                    this.listenTo(self.model, 'all', _.once(this.render));

                    this.listenTo(self.model, 'locationUpdate', self.eventHandler, self);
                    this.getUserInput();
                    this.updateGoogleMapUI();
                    if(locationsCollection.length > 0) {
                        self.render();
                    }
                    window.locationView = this;
                    if(!window.cartView){
                        window.locationView = this;
                        this.createMap();
                    } else {
                        self.getGeo();
                    }
                },
                updateGoogleMapUI: function() {
                    var self = this;
                    function updateMapUI(screenWidth, bool) {
                        if (screenWidth.matches) { // If media query matches
                          if(window.cartView && window.cartView.locationView){
                            self.model.map.setOptions({disableDefaultUI: false, keyboardShortcuts: false});
                          } 
                        } else{
                            if(window.cartView && window.cartView.locationView){
                                self.model.map.setOptions({disableDefaultUI: true, keyboardShortcuts:false});
                            }
                        }
                    }
                    var screenWidthMobile = window.matchMedia("(min-width: 700px)");
                    updateMapUI(screenWidthMobile, true); // Call listener function at run time
                    screenWidthMobile.addEventListener('change',updateMapUI); // Attach listener function on state changes
            
                },
                createMap: function() {
                    var self = this;
                    setTimeout(function(){
                        const mapEl = document.getElementById('googlemap');
                        //Backup for no-user geolocation, if window.geo isn't set, Default Coordinate for Dubai
                        const backupGeo = {coords: {latitude: 25.276987,longitude: 55.296249}};
                        const geo = self.model.get('geo') || window.currentGeo || backupGeo;
                        var coords;
                        if(window.storeGeo && window.cartView){
                            var loc = window.storeGeo;
                            coords = {lat: loc.coords.latitude, lng: loc.coords.longitude};
                        } else {
                            coords = {lat: geo.coords.latitude, lng: geo.coords.longitude};
                        }
                        var map;
                        if(mapEl) {
                        if(window.cartView){
                            map = new google.maps.Map(mapEl, {zoom: 11, center: coords, mapTypeControl:false, keyboardShortcuts: false, fullscreenControl:false, disableDefaultUI: false});
                        } else {
                            map = new google.maps.Map(mapEl, {zoom: 11, center: coords});
                        }
                        }
                        self.model.map = map;
                        self.model.map.markers = [];
                        self.model.geocoder = new google.maps.Geocoder();
                        self.updateMarkers();
                    }, 1000);
                    
                    // self.model.get('locations').apiGet().then(function(res){
                    // })
                },
                updateMarkers: function() {
                    var self = this;
                    if(self.model.map){
                        var map = self.model.map;
                        self.hideMarkers();
                        self.model.get('locations').get('items').toJSON().forEach(function(store, i) {
                            var config = {
                                position: store.geo,
                                map: map,
                                label: {
                                    'text':(i + 1).toString(),
                                    'color': '#ffffff'
                                },
                                icon: {
                                    url: "../resources/images/icons/svg/map-marker.svg",
                                    origin: new google.maps.Point(0,0),
                                    anchor: new google.maps.Point(0,0),
                                    labelOrigin: new google.maps.Point(12,10)
                                }
                            };
                            var marker = new google.maps.Marker(config);
                            marker.addListener("click", function(){
                                self.model.setActiveDropdown(store.code);
                                self.model.setActiveDropdownStore(store.name);
                                map.setCenter(store.geo);
                            });
                            self.model.map.markers.push(marker);
                        });
                    }
                },
                setMapOnAll: function(map){
                    var markers = this.model.map.markers;
                    for (var i = 0; i < markers.length; i++) {
                        markers[i].setMap(map);
                    }
                },
                hideMarkers: function(){
                    this.setMapOnAll(null);
                },
                populate: function (location) {
                    const self = this;
                    const show = function () {
                        self.render();
                        $('.mz-locationsearch-pleasewait').fadeOut();
                        self.$el.noFlickerFadeIn();
                    };
                    if (location) {
                        this.model.apiGet().then(show);
                    } else {
                        this.model.apiGet().then(show);
                    }
                },
                getRenderContext: function () {
                    const c = Backbone.MozuView.prototype.getRenderContext.apply(this, arguments);
                    c.model.positionError = this.positionError;
                    return c;
                },
                getUserInput: function(){
                    var self = this;
                    $('.mz-locations').on('keyup', '.town-street-name', function(e){
                        if(e.keyCode === 13){
                            self.searchByInputLocation();
                        }
                    });
                },
                setScrollViewModal: function(mouse, scrollPos){
                    if((mouse + 200) > 800){
                        this.model.setScrollPosition(scrollPos + 400);
                    } else if ((mouse - 200) < 0) {
                        this.model.setScrollPosition(scrollPos-400);
                    } else {
                        this.model.setScrollPosition(scrollPos);
                    }
                },
                setScrollViewStoreFinder: function(mouse, scrollPos){
                    this.model.setScrollPosition(scrollPos);
                },
                setHrsScrollView: function(mouse, scrollPos){
                    this.model.setScrollPosition(scrollPos + 100);
                },
                toggleDropdown: function(e) {
                    e.preventDefault();
                    var mouse = e.clientY;
                    var modalExists = $('.modal-content').length;
                    var storeFinderExists = $('.location-container').length;
                    var modalScroll = $('.modal-content').scrollTop();
                    var storeFinderScroll = $('.location-container').scrollTop();

                    if(storeFinderExists){
                        this.setScrollViewStoreFinder(mouse, storeFinderScroll);
                    } 
                    if(modalExists) {
                        this.setScrollViewModal(mouse, modalScroll);
                    }
                    
                    var getMzInfo = function(targ) {
                        if(targ === null) {
                            return;
                        }
                        if(targ.dataset.mzDisplaydrop && targ.dataset.mzStorename){
                            return {'code': targ.dataset.mzDisplaydrop, 'name': targ.dataset.mzStorename};
                        } else {
                            return getMzInfo(targ.parentNode);
                        }
                    };
    
                    var location = getMzInfo(e.target);
                    var clicked = location;
                    var current = this.model.get('activeDropdown');
                    this.model.toggleHrsDropdown(false);
                    this.model.toggleDptDropdown(false);
                    if (clicked !== current) {
                        this.model.setActiveDropdown(clicked.code);
                        this.model.setActiveDropdownStore(clicked.name);
                    }
                    if(clicked.code === current){
                        this.model.setActiveDropdown('');
                    }
                },
                toggleHoursDropdown: function(e) {
                    e.stopPropagation();
                    var storeFinderScroll = $('.location-container').scrollTop();
                    var mouse = e.clientY;
                    this.setHrsScrollView(mouse, storeFinderScroll);


                    var isActive = this.model.get('isHrsActive');
                    this.model.toggleHrsDropdown(!isActive);
                },
                toggleDepartmentDropdown: function(e){
                    e.stopPropagation();
                    var isActive = this.model.get('isDptActive');
                    this.model.toggleDptDropdown(!isActive);
                },
                render: function() {
                    var self = this;
                    preserveElements(self, ['#googlemap'], function() {
                        Backbone.MozuView.prototype.render.call(self);
                    });
                    $('.modal-content').scrollTop(self.model.get('scrollPosition'));
                    $('.location-container').scrollTop(self.model.get('scrollPosition'));
                }
             });
        var CartStoreFinder = StoreFinder.extend({
            templateName: "modules/cart/cartStoreFinder",
            initialize: function() {
                StoreFinder.prototype.initialize.apply(this, arguments);
                var self = this;
                this.createModal();
                this.getUserInput();
                this.enableSearchButton();
            },
            createModal: function() {
                this.modal = new ModalDialog.init({
                    elementId : "mz-location-selector",
                    hasXButton: false,
                    width: "600px",
                    scroll: true,
                    bodyHeight: "600px",
                    backdrop: 'static',
                    keyboard: false
                });
            },
            showModal: function(e) {
                this.modal.show();
            },
            closeModal: function() {
                this.modal.hide();
                if(!this.model.get('selectedLocation')) {
                    $(".mz-tracked-delivery-section input[value='Ship']").trigger("click");
                }
            },
            resetModal: function() {
                this.model.setSearchInput('');
                this.model.setScrollPosition(0);
                this.model.setActiveDisplay('list');
                this.model.setLocationHasBeenSearched(false);
                this.model.getLocations();
                var locationCoords = this.model.get('selectedLocationCoords');
                this.model.setActiveDropdown('');
                if(locationCoords){
                    this.model.map.setCenter({lat: locationCoords.lat, lng: locationCoords.lng});
                    this.updateMarkers();
                } else {
                    if (window.storeGeo) {
                        var geo = window.storeGeo.coords;
                        this.model.map.setCenter({lat: geo.latitude, lng: geo.longitude});
                    }
                }

                this.model.setZeroNearbyLocations(false);
                this.render();
            }, 
            toggleDisplay: function(e) {
                var clicked = e.target.dataset.mzDisplay;
                var current = this.model.get('activeDisplay');
                this.model.setScrollPosition(0);
                if( clicked !== current ) {
                    this.model.set('activeDisplay', clicked);
                }

                if(clicked == 'map'){
                    if(!this.model.map){
                        if(this.model.get('geo')){
                            this.createMap();
                        } 
                    } 
                }
            },
            selectStoreForPickup: function(e){
                var selectedStoreData = e.target.dataset.mzLocationData;
                
                var selectedLocation = JSON.parse(selectedStoreData);
                // $.cookie('userSelectedLocation', selectedStoreData, {expires: 1});
                sessionStorage.setItem('userSelectedLocation', selectedStoreData);

                window.cartView.cartView.model.set('cookieLocation', selectedLocation.name);
                var lat = selectedLocation.geo.lat;
                var lng = selectedLocation.geo.lng;

                if(this.model) {
                    if(this.model.map) this.model.map.setCenter({lat: lat, lng: lng});
                    this.model.setSelectedLocation(selectedLocation.name);
                    this.model.setActiveDropdown(selectedLocation.code);
                    this.model.setSelectedLocationCoords({lat:lat, lng:lng});
                }
                this.trigger('assignPickupLocation', selectedStoreData);

                this.closeModal();
            }, 
            getUserInput: function(){
                var self = this;
                $('.modal').on('keyup', '.search-bar-input', function(e){
                    if(e.keyCode === 13){
                        self.searchByInputLocation();
                    }
                });
            },
            enableSearchButton: function(){
                var self = this;
                $('.modal').on('keyup', '.search-bar-input', function(e){
                    var input = $('.search-bar-input').val().trim();
                    if(input.length > 0){
                        $('.search-bar-button').removeClass("disabled");
                    } else if (input.length === 0){
                        $('.search-bar-button').addClass("disabled");
                    }
                });
            }
        });



        return {
            // LocationsView: LocationsView,
            // LocationsSearchView: LocationsSearchView,
            StoreFinder: StoreFinder,
            CartStoreFinder: CartStoreFinder
        };
    }
);
