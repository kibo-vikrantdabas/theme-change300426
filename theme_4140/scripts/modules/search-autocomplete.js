define(['shim!vendor/typeahead.js/typeahead.bundle[modules/jquery-mozu=jQuery]>jQuery', 'hyprlive', 'modules/api',
    'hyprlivecontext', 'underscore', 'modules/mobile-sticky-header'], function ($, Hypr, api,
        HyprLiveContext, _, StickyHeader) {

    // bundled typeahead saves a lot of space but exports bloodhound to the root object, let's lose it
    var Bloodhound = window.Bloodhound.noConflict();

    // bloodhound wants to make its own AJAX requests, and since it's got such good caching and tokenizing algorithms, i'm happy to help it
    // so instead of using the SDK to place the request, we just use it to get the URL configs and the required API headers

    // create bloodhound instances for each type of suggestion

    var Search = function() {
        return {
            qs : '%QUERY',
            eqs : function() {
                var self = this;
                return window.encodeURIComponent(self.qs);
            },
            suggestPriorSearchTerms: Hypr.getThemeSetting('suggestPriorSearchTerms'),
            getApiUrl : function (groups) {
                var self = this;
                var url =  HyprLiveContext.locals.siteContext.siteSubdirectory +
                "/api/commerce/catalog/storefront/productsearch/suggest2?receiverVersion=2&query=" +
                encodeURI(self.qs) +
                "&groups=" +
                encodeURIComponent(groups);
                return url;
            },
            ajaxConfig : {
                headers: api.getRequestHeaders()
            },
            nonWordRe : /\W+/,
            makeSuggestionGroupFilter : function (name) {
                return function (res) {
                    res.suggestionGroups.map(function(group){
                        if (!_.isUndefined(group)) {
                            group.suggestions.map(function (value) {
                                if(value.suggestion) {
                                    if (!_.isUndefined(value.suggestion.productImageUrls)) {
                                        delete value.suggestion.productImageUrls;
                                    }
                                    if (!_.isUndefined(value.suggestion.categoryImageUrls)) {
                                        delete value.suggestion.categoryImageUrls;
                                    }
                                }
                            });
                        }
                    });

                    var groups =  res.suggestionGroups.filter(function(group){
                        return group.name === name;
                    });

                    if(groups.length) {
                        return groups[0].suggestions;
                    }
                    else {
                        return [];
                    }
                   
                };
            },

            makeTemplateFn : function (name) {
                var tpt = Hypr.getTemplate(name);
                return function (obj) {
                    return tpt.render(obj);
                };
            },

            setDataSetConfigs : function() {
                var self = this;
                self.dataSetConfigs = [
                    {
                        name: 'terms',
                        displayKey: function (datum) {
                            return datum.suggestion.term;
                        },
                        templates: {
                            header: '<div style="display: flex; align-items: center;"><span style="margin-right: 10px;">Suggestions</span><hr style="border-top: 1px solid #979797; flex-grow: 1; height: 0; margin: 0;"></div>',
                            suggestion: self.makeTemplateFn('modules/search/autocomplete-page-result')
                        },
                        source: self.AutocompleteManager.datasets.terms.ttAdapter()
                    },
                    {
                        name: 'products',
                        displayKey: function (datum) {
                            return datum.suggestion.productCode;
                        },
                        templates: {
                            header: '<div style="display: flex; align-items: center;"><span style="margin-right: 10px;">Products</span><hr style="border-top: 1px solid #979797; flex-grow: 1; height: 0; margin: 0;"></div>',
                            suggestion: self.makeTemplateFn('modules/search/autocomplete-page-result')
                        },
                        source: self.AutocompleteManager.datasets.products.ttAdapter()
                    },
                    {
                        name: 'categories',
                        displayKey: function (datum) {
                            return datum.suggestion.categoryCategoryCode;
                        },
                        templates: {
                            header: '<div style="display: flex; align-items: center;"><span style="margin-right: 10px;">Categories</span><hr style="border-top: 1px solid #979797; flex-grow: 1; height: 0; margin: 0;"></div>',
                            suggestion: self.makeTemplateFn('modules/search/autocomplete-page-result')
                        },
                        source: self.AutocompleteManager.datasets.categories.ttAdapter()
                    }
                ];
            },

            datasets: function() {
                var self = this;
                return {
                    terms: new Bloodhound({
                        datumTokenizer: function (datum) {
                            return datum.suggestion.term.split(self.nonWordRe);
                        },
                        queryTokenizer: Bloodhound.tokenizers.whitespace,
                        remote: {
                            url: self.getApiUrl('terms,categories,products'),
                            wildcard: self.eqs(),
                            filter: self.makeSuggestionGroupFilter("Terms"),
                            rateLimitWait: 400,
                            ajax: self.ajaxConfig
                        }
                    }),
                    products: new Bloodhound({
                        datumTokenizer: function (datum) {
                            return datum.suggestion.term.split(self.nonWordRe);
                        },
                        queryTokenizer: Bloodhound.tokenizers.whitespace,
                        remote: {
                            url: self.getApiUrl('terms,categories,products'),
                            wildcard: self.eqs(),
                            filter: self.makeSuggestionGroupFilter("Products"),
                            rateLimitWait: 400,
                            ajax: self.ajaxConfig
                        }
                    }),
                    categories: new Bloodhound({
                        datumTokenizer: function (datum) {
                            return datum.suggestion.term.split(self.nonWordRe);
                        },
                        queryTokenizer: Bloodhound.tokenizers.whitespace,
                        remote: {
                            url: self.getApiUrl('terms,categories,products'),
                            wildcard: self.eqs(),
                            filter: self.makeSuggestionGroupFilter("Categories"),
                            rateLimitWait: 400,
                            ajax: self.ajaxConfig
                        }
                    })
                };
            },

            initialize: function() {
                var self = this;
                self.AutocompleteManager = {
                    datasets: self.datasets()
                };

                $.each(self.AutocompleteManager.datasets, function (name, set) {
                    set.initialize();
                });

                self.setDataSetConfigs();

            }
        };
    };

    $(document).ready(function () {
        var $fields = $('[data-mz-role="searchquery"]').each(function(field){
            var search = new Search();
            search.initialize();
            var $field = search.AutocompleteManager.$typeaheadField = $(this);
            search.AutocompleteManager.typeaheadInstance = $field.typeahead({
                minLength: 3
            }, search.dataSetConfigs).data('ttTypeahead');
            // user hits enter key while menu item is selected;
            $field.on('typeahead:selected', function (e, data, set) {
                if (data.suggestion.productCode) window.location = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + "/p/" + data.suggestion.productCode;
                if (data.suggestion.term) window.location = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + "/search?query=" + data.suggestion.term.replace(/(<([^>]+)>)/ig, "").replaceAll(" ", "+");
                if (data.suggestion.categoryCategoryId) window.location = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + "/c/" + data.suggestion.categoryCategoryId.toString();
            });
        });

        var applyRemoveBackdrop = function(addedClass, removedClass) {
            $(".mz-searchbackdrop")
            .addClass(addedClass)
            .removeClass(removedClass);
        };

        var bringDropDownMenu = function(item, e) {
            var currentSearchTerm = item;
            var event = e;
            var $trigger = $('.recentsearch-dropdown');
            $('.recentsearch-dropdown .recent-data-history').html('<div class="recentsearch-data"><ul class="data-ordered">' + Hypr.getLabel('recentSearch')+ ' </ul></div>');
            var recentValue = JSON.parse(localStorage.getItem('recentData'));
            // if($trigger !== event.target && !$trigger.has(event.target).length){
            //     $(".recentsearch-dropdown").slideUp("fast");
            // } 

            if (_.isEqual(currentSearchTerm, "")) {
                if(!_.isUndefined(recentValue)){
                    for(var i = 0; i<= recentValue.length; i++){
                            if(!_.isUndefined(recentValue[i])){
                                $('.data-ordered').append('<li><a class="recent-link">'+recentValue[i]+'</a></li>');
                            }
                    }
                }
                $('.recentsearch-dropdown').show();
                $('.clear-recent').show();
                $('.recent-link').on('click', function(e){
                    var searchData = e.currentTarget.innerText.replaceAll(" ", "+");
                    var dataUrl = location.origin + (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + '/search?query='+ searchData;
                    var eventData ={};
                    if(window.globalEventBus){
                        eventData = {
                          'custom_event': 'internal searches',
                           'event_params':{
                            'event_act': 'your recent search',
                            'event_lbl': e.currentTarget.innerText.toLowerCase()
                           }
                        
                        };
                    }
                    window.globalEventBus.emit('dataLayerEvent', eventData);
                    window.location.href = dataUrl;
                    $('.mz-searchbox-input').val(e.currentTarget.innerText);
                });
            }else{
                // $('.recentsearch-dropdown').hide();
                // $('.clear-recent').hide();
            }
        };

        $('.mz-searchbox-clear').on("click", function (event) {
            $(".mz-searchbox-input").val("");
            $(".recentsearch-dropdown").hide();
            $('.tt-dropdown-menu').hide();
            applyRemoveBackdrop("deactive","active");
            $('.mz-search-button').css("background-color", '');
            $('.black-searchIcon').removeClass('active');
            $('.mz-searchbox-field').css("z-index", '');
            $('.mz-searchbox-input').css({
                "background-color":'',
                "border": ''
            });
            $('.mz-searchbox-clear').css("display","none");
            event.stopImmediatePropagation();
        });
        
        $('.mz-searchbox-button').on('click', function (event) {
            var searchInput = $('.mz-subheader-conatiner .mz-searchbox-input.tt-input').val();
            var eventData = {};
            if(window.globalEventBus){
                eventData = {
                  'custom_event': 'internal searches',
                   'event_params':{
                    'event_act': 'open search',
                    'event_lbl': searchInput.toLowerCase()
                   }
                
                };
                window.globalEventBus.emit('dataLayerEvent', eventData);
            }
            if($('.black-searchIcon').hasClass('deactive')){
                $('.black-searchIcon').addClass('active');
            }else{
                $('.black-searchIcon').removeClass('active');
            }
            var currentSearchTerm = $('.mz-subheader-conatiner .mz-searchbox-input.tt-input').val();
            eventData = {};

            //Commenting Below Code As Below Code Is Not Requried For GA4 Events
            // if (window.globalEventBus) {
            //     eventData.eventCategory = "filter";
            //     eventData.eventAction = "filter options";
            //     eventData.eventLabel = "<" + currentSearchTerm + ">";
            //     window.globalEventBus.emit('dataLayerEvent', eventData);
            // }
            if(!currentSearchTerm){
                applyRemoveBackdrop("active","deactive");
                $('.mz-searchbox-field').css("z-index", '8');
                $('.mz-searchbox-input').css({
                    "background-color":'#FFFFFF',
                    "border": '1px solid #000000'
                });
                $('.mz-searchbox-input').focus();
                $('.mz-search-button').css("background-color", 'black');
                $('.mz-searchbox-clear').show();
               
                bringDropDownMenu(currentSearchTerm, event);
                event.stopImmediatePropagation();
                return false;
            }else{
                $('.mz-searchbox-clear').show();
                bringDropDownMenu(currentSearchTerm, event);
                event.stopImmediatePropagation();
                return true;
            }
        });

         //Commenting Below Code As Below Code Is Not Requried For GA4 Events
        // $('.mz-searchbox-button-no-search').on('click', function () {
        //     var noSearchCurrentInput = $('.mz-l-container-nosearch-no-result').val();
        //     let eventData = {};
        //     if (window.globalEventBus) {
        //         eventData.eventCategory = "filter";
        //         eventData.eventAction = "filter options";
        //         eventData.eventLabel = "<" + noSearchCurrentInput + ">";
        //       //  window.globalEventBus.emit('dataLayerEvent', eventData);
        //       }
        // });
        
        $('.mz-searchbox-container.mobile .mz-close-icon .mz-searchbox-container').on('click', function () {
            $('.mz-searchbox-container.mobile').addClass('deactive').removeClass('active');
            $('.mz-searchbox-container.desktop').css('display','block');
        });

        // $('.mz-searchbox-input').on('click', function () {
        //     $('.mz-searchbox-input').css("background-color", '#FFFFFF');
        //     $('.mz-pageheader').css("background-color", 'rgba(0,0,0,-0.4)');
        //     $('.mz-category').css("background-color", 'rgba(0,0,0,0.6)');
        //     $('.mz-searchresults').css("background-color", 'rgba(0,0,0,0.6)');
        //     $('.mz-sitenav').css("background-color", 'rgba(0,0,0,-0.4)');
        //     $('.mz-searchbox-input').css("border", '1px solid #000000');
        //     $('.mz-search-button').css("background-color", '#000000');
        //     if ($.trim(this.value).length > 0) {
        //         $('.mz-searchbox-clear').show();
        //     }
        //     else {
        //         $('.mz-searchbox-clear').hide();
        //     }

        //     $('.mz-searchbox-clear').on("click", function () {
        //         $('.mz-searchbox-input').val("");
        //     });
        // });

        $('.mz-searchbox-input').on( 'keyup', function () {
            var currentSearchTerm = $('.mz-subheader-conatiner .mz-searchbox-input.tt-input').val();
            if ($.trim(currentSearchTerm).length > 0) {
                $('.mz-searchbox-clear').show();
            }else {
                $('.mz-searchbox-clear').hide();
            }
        });
        $('.mz-searchbox-container.mobile .mz-searchbox-input').on('keydown', function(event){
            var currentQuery = event.currentTarget.value;
            if(!_.isEqual(currentQuery, "")){
                if (event.key  === "Enter"){
                   window.location.href = location.origin + (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + '/search?query='+ currentQuery.replaceAll(" ", "+");
                }
            }
        });
        $('.mz-searchbox-container.mobile .mz-searchbox-input').on('click', function(event){
            var currentQuery1 = event.currentTarget.value;
            if(_.isEqual(currentQuery1, "")){
               event.stopImmediatePropagation();
            }
        });

        $('.mz-searchbox-input').click(function (event) {
            var mql = window.matchMedia("screen and (min-width: 200px) and (max-width: 1000px)");
            applyRemoveBackdrop("active","deactive");
            StickyHeader.toggleSearchField(mql);
            if(mql.matches){
                if($('.mz-searchbox-container.mobile').hasClass('deactive')){
                    $('.mz-searchbox-container.mobile').addClass('active').removeClass('deactive');
                    $('.mz-searchbox-container.desktop').css('display','none');
                }else{
                    $('.mz-searchbox-container.mobile').addClass('deactive').removeClass('active');
                    applyRemoveBackdrop("deactive","active");
                    $('.mz-searchbox-container.desktop').css('display','block');
                    $('.recentsearch-dropdown').css('display','none');
                    $('.mz-searchbox-clear').css('display','none');
                }
            }
            if($('.black-searchIcon').hasClass('deactive')){
                $('.black-searchIcon').addClass('active');
            }else{
                $('.black-searchIcon').removeClass('active');
            }
            $('.mz-searchbox-field').css("z-index", '8');
            if(mql.matches){
                $('.mz-searchbox-input').css({
                    "background-color":'#FFFFFF',
                    "border": 'none'
                });
            }else{
                $('.mz-searchbox-input').css({
                    "background-color":'#FFFFFF',
                    "border": '1px solid #000000'
                });
            }
            $('.mz-searchbox-input').focus();
            $('.mz-search-button').css("background-color", 'black');
            $('.mz-searchbox-clear').show();
            $(".mz-subheader-conatiner .mz-searchbox-input.tt-input").val("");
            $(".mz-searchbox-input").val("");
           
            var $trigger = $('.recentsearch-dropdown');
            $('.recentsearch-dropdown .recent-data-history').html('<div class="recentsearch-data"><ul class="data-ordered">' + Hypr.getLabel('recentSearch')+ ' </ul></div>');
            var recentValue = JSON.parse(localStorage.getItem('recentData'));
            var currentSearchTerm = $('.mz-subheader-conatiner .mz-searchbox-input.tt-input').val();
            // if($trigger !== event.target && !$trigger.has(event.target).length){
            //     $(".recentsearch-dropdown").slideUp("fast");
            // }
                 
            if (_.isEqual(currentSearchTerm, "")) {
                if(!_.isUndefined(recentValue) && !_.isNull(recentValue) ){
                    for(var i = 0; i<= recentValue.length; i++){
                        if(!_.isUndefined(recentValue[i])){
                            $('.data-ordered').append('<li><a class="recent-link">'+decodeURIComponent(recentValue[i])+'</a></li>');
                            $('.recentsearch-dropdown').show();
                            $('.clear-recent').show();
                        }
                    }
                }else{
                    $('.recentsearch-dropdown').hide();
                    $('.recentsearch-data').hide();
                }
              
                $('.recent-link').on('click', function(e){
                    var searchData = e.currentTarget.innerText.replaceAll(" ", "+");
                    var dataUrl = location.origin+ (HyprLiveContext.locals.siteContext.siteSubdirectory || '')+'/search?query='+ searchData;
                    var eventData ={};
                    if(window.globalEventBus){
                       eventData = {
                          'custom_event': 'internal searches',
                           'event_params':{
                            'event_act': 'your recent search',
                            'event_lbl': e.currentTarget.innerText.toLowerCase()
                           }
                        
                        };
                    }
                    window.globalEventBus.emit('dataLayerEvent', eventData);
                    window.location.href = dataUrl;
                    $('.mz-searchbox-input').val(e.currentTarget.innerText);
                });
            }
            else{
               $('.recentsearch-dropdown').hide();
               $('.clear-recent').hide();
            }

            event.stopImmediatePropagation(); 
        });

        $('.clear-recent').on('click', function(e){
            localStorage.clear();
            $('.recent-link').css('display', 'none');
        });
        if (window.matchMedia('(min-width:710px) and (max-width: 712px)').matches){
            $('.clear-recent').css('right','-24px !important');
        }
       // $('.recentsearch-dropdown').css('position', 'relative');
        $('.clear-recent').css('z-index','102');
        $('.clear-recent').css('text-decoration', 'underline');
        $('.clear-recent').css('font-weight', '600');
        $('.clear-recent').css({
            position: 'absolute',            
            top: '18px',
            background: '#fff',
            border: '1px solid #fff',
            color: '#757575'
        });
      

        $(document).click(function (e) {
            if (!$(e.target).hasClass('.mz-searchbackdrop')) {
                $('.mz-searchbackdrop')
                .removeClass("active")
                .addClass("deactive");
                $('.mz-searchbox-field').css("z-index", '');
                $('.mz-searchbox-input').css({
                    "background-color":'',
                    "border": ''
                });
                $('.mz-search-button').css("background-color", '');
                $('.mz-searchbox-clear').hide();
                $('.recentsearch-dropdown').hide();
                $('.tt-dropdown-menu').hide();
                $('.clear-recent').hide();
                $(".mz-searchbox-input").val("");
                $('.black-searchIcon').removeClass('active');
                StickyHeader.toggleSearchBarOnClose();

            }
        });
    });   
    return Search;
});