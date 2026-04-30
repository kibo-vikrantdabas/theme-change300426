require(['modules/jquery-mozu', 'hyprlive', 'modules/backbone-mozu', 'modules/models-location', 'modules/models-product', 'modules/views-location'],
    function($, Hypr, Backbone, LocationModels, ProductModels, LocationViews) {

        var positionErrorLabel = Hypr.getLabel('positionError');


        $(document).ready(function() {

            const $locationSearch = $('#store-finder');
            const view = new LocationViews.StoreFinder({
                model: new LocationModels.StoreFinder(),
                el: $locationSearch
            });

            window.lv = view;
        });
    }
);
