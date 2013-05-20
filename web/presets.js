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
];

$(function() {
    var ol = $('#presets');
    _.each(PRESETS, function(preset) {
        ol.append('<li>' + preset.name + '</li>');
    });
});
