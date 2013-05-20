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
