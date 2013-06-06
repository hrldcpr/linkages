var PRESETS = [
    $.extend(new Linkage(), {
        name: 'basic',
        vertices: [[100, 100],
                   [200, 100],
                   [200, 200]],
        fixed: [1],
        edges: [{i: 0, j: 1},
                {i: 1, j: 2}],
        angles: []
    }),

    $.extend(new Linkage(), {
        name: 'Watt',
        vertices: [[63.999999999999694, 300.99999999999977], [264.76193054669005, 424.47670765539044], [297.32431625141692, 269.52156653324812], [523.0, 313.0], [281.62190416645717, 343.45112112484475]],
        fixed: [3, 0],
        edges: [{i: 2, j: 3},
                {i: 0, j: 1},
                {i: 1, j: 4},
                {i: 2, j: 4}],
        angles: [{i: 4, j: 1, k: 2}],
    }),

    $.extend(new Linkage(), {
        name: 'Peaucellier',
        vertices: [[50.0, 300.0], [150.0, 300.0], [250.0, 300.0], [400.0, 400.0], [400.0, 200.0], [550.0, 300.0]],
        fixed: [0, 1],
        edges: [{i: 0, j: 3},
                {i: 0, j: 4},
                {i: 1, j: 2},
                {i: 2, j: 3},
                {i: 2, j: 4},
                {i: 3, j: 5},
                {i: 4, j: 5}],
        angles: [],
    }),

];

$(function() {
    var ol = $('#presets');
    _.each(PRESETS, function(preset) {
        ol.append('<li>' + preset.name + '</li>');
    });
});
