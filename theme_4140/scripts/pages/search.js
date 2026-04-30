define(['modules/jquery-mozu', "modules/views-collections","underscore","hyprlive"], function ($, CollectionViewFactory, _, Hypr) {
    $(document).ready(function () {
        var recentQueryData, recentSearchData;
        if (location.href.includes("category")) {
            recentQueryData = location.href.substring(location.href.indexOf("=") + 1, location.href.indexOf("&")).replaceAll("+", " ").trim();
        }
        else {
            if(!location.search.includes('facetValueFilter') && !location.search.includes('sortBy')){
                recentQueryData = location.href.substring(location.href.indexOf("=") + 1).replaceAll("+", " ").trim();
            }
        }
        recentSearchData = JSON.parse(localStorage.getItem('recentData'));
        if (_.isNull(recentSearchData)) {
            localStorage.setItem('recentData', JSON.stringify([recentQueryData]));
        }
        else {
            if (!_.isEmpty(recentSearchData)) {
                if (!recentSearchData.includes(recentQueryData)) {
                    recentSearchData.push(recentQueryData);
                    localStorage.setItem('recentData', JSON.stringify(recentSearchData));
                }
            }
            else {
                recentSearchData.push(recentQueryData);
                localStorage.setItem('recentData', JSON.stringify(recentSearchData));
            }
        }
        
        window.facetingViews = CollectionViewFactory.createFacetedCollectionViews({
            $body: $('[data-mz-search]'),
            template: "search-interior",
            Hypr:Hypr
        });
    });
});