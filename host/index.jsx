// ==========================================
// TAMOFX UNIVERSAL HOST SCRIPT (AE & PR)
// ==========================================

// 1. SES MOTORU
function insertAudioUniversal(filePath) {
    try {
        var f = new File(filePath);
        if (!f.exists) {
            return "Hata: Ses dosyası bulunamadı -> " + filePath;
        }

        // AFTER EFFECTS
        if (BridgeTalk.appName.indexOf("aftereffects") !== -1) {
            app.beginUndoGroup("TamoFX SFX Insert");
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                var io = new ImportOptions(f);
                var footage = app.project.importFile(io);
                var audioLayer = comp.layers.add(footage);
                audioLayer.startTime = comp.time;
            } else {
                app.endUndoGroup();
                return "Lütfen After Effects'te açık bir Kompozisyon seçin!";
            }
            app.endUndoGroup();
            return "OK";
        } 
        // PREMIERE PRO
        else if (BridgeTalk.appName.indexOf("premierepro") !== -1) {
            var seq = app.project.activeSequence;
            if (!seq) {
                return "Lütfen Premiere Pro'da açık bir Timeline seçin!";
            }
            app.project.importFiles([filePath], true, app.project.getInsertionBin(), false);
            var items = app.project.rootItem.children;
            var targetItem = null;
            for (var i = 0; i < items.numItems; i++) {
                if (items[i].getMediaPath && items[i].getMediaPath().replace(/\\/g, '/').toLowerCase() === filePath.toLowerCase()) {
                    targetItem = items[i];
                    break;
                }
            }
            if (!targetItem && items.numItems > 0) {
                targetItem = items[items.numItems - 1];
            }
            if (targetItem && seq.audioTracks.numTracks > 0) {
                var audioTrack = seq.audioTracks[0];
                audioTrack.insertClip(targetItem, seq.getPlayerPosition());
                return "OK";
            }
        }
    } catch(err) {
        return "ExtendScript Hatası: " + err.toString();
    }
    return "OK";
}

// 2. TEXT ŞABLON MOTORU (HEM AE HEM PR UYUMLU)
function insertTextUniversal(type) {
    try {
        // AFTER EFFECTS
        if (BridgeTalk.appName.indexOf("aftereffects") !== -1) {
            app.beginUndoGroup("TamoFX Text");
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                app.endUndoGroup();
                return "Lütfen After Effects'te açık bir Kompozisyon seçin!";
            }

            var t = comp.time;
            var layer = null;

            if (comp.selectedLayers.length > 0 && comp.selectedLayers[0] instanceof TextLayer) {
                layer = comp.selectedLayers[0];
            } else {
                layer = comp.layers.addText("TAMOFX TITLE");
                layer.startTime = t;
                layer.property("Transform").property("Position").setValue([comp.width / 2, comp.height / 2]);
            }

            if (type === "droptext") {
                var p = layer.property("Transform").property("Position");
                var curP = p.value;
                p.setValueAtTime(t, [curP[0], curP[1] - 200]);
                p.setValueAtTime(t + 0.35, curP);
            } 
            else if (type === "jenerik") {
                var o = layer.property("Transform").property("Opacity");
                var s = layer.property("Transform").property("Scale");
                o.setValueAtTime(t, 0);
                o.setValueAtTime(t + 0.8, 100);
                s.setValueAtTime(t, [75, 75]);
                s.setValueAtTime(t + 1.2, [100, 100]);
            } 
            else if (type === "typewriter") {
                var textProp = layer.property("Text").property("Source Text");
                textProp.expression = 'var str = value.text; var l = Math.round(linear(time - ' + t + ', 0, 0.8, 0, str.length)); str.substr(0, l);';
            } 
            else if (type === "elite") {
                var s = layer.property("Transform").property("Scale");
                s.setValueAtTime(t, [0, 0]);
                s.setValueAtTime(t + 0.2, [115, 115]);
                s.setValueAtTime(t + 0.35, [100, 100]);
            } 
            else if (type === "typography") {
                var p = layer.property("Transform").property("Position");
                var curP = p.value;
                p.setValueAtTime(t, [curP[0] + 150, curP[1]]);
                p.setValueAtTime(t + 0.35, curP);
            }

            app.endUndoGroup();
            return "OK";
        }
        // PREMIERE PRO
        else if (BridgeTalk.appName.indexOf("premierepro") !== -1) {
            var seq = app.project.activeSequence;
            if (!seq) {
                return "Lütfen Premiere Pro'da açık bir Timeline seçin!";
            }
            // Premiere Pro Timeline'ında açık video kanalına başlık oluştur
            if (seq.videoTracks.numTracks > 0) {
                app.enableQE();
                qe.project.getActiveSequence().addGraphicTrack();
            }
            return "OK";
        }
    } catch(err) {
        return "ExtendScript Hatası: " + err.toString();
    }
    return "OK";
}

// 3. SPEED GRAPH (EASE CURVE)
function applyKeyframeInfluence(inVal, outVal) {
    app.beginUndoGroup("TamoFX Ease");
    try {
        var comp = app.project.activeItem;
        if (comp && comp instanceof CompItem) {
            var selectedLayers = comp.selectedLayers;
            for (var i = 0; i < selectedLayers.length; i++) {
                var props = selectedLayers[i].selectedProperties;
                for (var j = 0; j < props.length; j++) {
                    var prop = props[j];
                    if (prop.canVaryOverTime && prop.selectedKeys.length > 0) {
                        for (var k = 0; k < prop.selectedKeys.length; k++) {
                            var keyIdx = prop.selectedKeys[k];
                            var eIn = new KeyframeEase(0, Number(inVal));
                            var eOut = new KeyframeEase(0, Number(outVal));
                            if (prop.propertyValueType == PropertyValueType.TwoD_SPATIAL || prop.propertyValueType == PropertyValueType.ThreeD_SPATIAL) {
                                prop.setTemporalEaseAtKey(keyIdx, [eIn, eIn, eIn], [eOut, eOut, eOut]);
                            } else {
                                prop.setTemporalEaseAtKey(keyIdx, [eIn], [eOut]);
                            }
                        }
                    }
                }
            }
        }
    } catch(err) {}
    app.endUndoGroup();
    return "OK";
}

// 4. SHAKE PRESETLERİ
function applyShakePreset(type) {
    app.beginUndoGroup("TamoFX Shake");
    try {
        var comp = app.project.activeItem;
        if (comp && comp instanceof CompItem && comp.selectedLayers.length > 0) {
            var expr = type === "subtle" ? "wiggle(2, 15);" : (type === "heavy" ? "wiggle(8, 45);" : (type === "earthquake" ? "wiggle(14, 70);" : "posterizeTime(10); wiggle(10, 35);"));
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                comp.selectedLayers[i].property("Transform").property("Position").expression = expr;
            }
        }
    } catch(e) {}
    app.endUndoGroup();
    return "OK";
}

function removeShake() {
    app.beginUndoGroup("TamoFX Clear Shake");
    try {
        var comp = app.project.activeItem;
        if (comp && comp instanceof CompItem && comp.selectedLayers.length > 0) {
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                comp.selectedLayers[i].property("Transform").property("Position").expression = "";
            }
        }
    } catch(e) {}
    app.endUndoGroup();
    return "OK";
}

// 5. UNIVERSAL PRESETS
function applyUniversalPreset(type) {
    app.beginUndoGroup("TamoFX Preset");
    try {
        var comp = app.project.activeItem;
        if (comp && comp instanceof CompItem && comp.selectedLayers.length > 0) {
            var layer = comp.selectedLayers[0];
            if (type === "zoomin") {
                var s = layer.property("Transform").property("Scale");
                var t = comp.time;
                s.setValueAtTime(t, [100, 100]);
                s.setValueAtTime(t + 0.35, [115, 115]);
            } else if (type === "rotationswing") {
                layer.property("Transform").property("Rotation").expression = "Math.sin(time*3)*6;";
            }
        }
    } catch(e) {}
    app.endUndoGroup();
    return "OK";
}