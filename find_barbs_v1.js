/*
 * Script Name: Scout Barbs Not In LA
 * Version: v1.0.0
 * Last Updated: 2026-04-21
 * Author: OpenAI / Custom build for Controleng
 */

/*
 javascript:$.getScript('https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Scout_Barbs_Not_In_LA_v1.js');
*/

var scriptData = {
    name: 'Scout Barbs Not In LA',
    version: 'v1.0.0',
    author: 'OpenAI',
    authorUrl: 'https://chatgpt.com/',
    helpLink: '#',
};

// User Input
if (typeof DEBUG !== 'boolean') DEBUG = false;

// Globals
var ALLOWED_GAME_SCREENS = ['map'];
var COORDS_REGEX = /\d{1,3}\|\d{1,3}/g;
var STORAGE_KEY = 'YAVER_SCOUT_GAPS_STORE_V1';
var DEFAULT_STATE = {
    CURRENT_VILLAGE: `${game_data.village.x}|${game_data.village.y}`,
    MIN_POINTS: 26,
    MAX_POINTS: 12154,
    RADIUS: 15,
};
var VILLAGE_CACHE_KEY = 'YAVER_SCOUT_GAPS_VILLAGE_TXT';
var VILLAGE_CACHE_TIME_KEY = 'YAVER_SCOUT_GAPS_VILLAGE_TXT_TIME';
var VILLAGE_CACHE_TTL = 60 * 60 * 1000;

var BACKGROUND_ATTACK_STATE = {
    enterHeld: false,
    enterLoopRunning: false,
    attackBusy: false,
    stopReason: null,
    enterKeyActive: false,
};

var CURRENT_RESULTS = [];
var CURRENT_RESULT_COORDS = [];
var CURRENT_LA_COORDS = new Set();

// Translations
var translations = {
    en_DK: {
        'Scout Barbs Not In LA': 'Scout Barbs Not In LA',
        Help: 'Help',
        'This script requires PA and FA to be active!':
            'This script requires PA and FA to be active!',
        'Redirecting...': 'Redirecting...',
        'Current Village:': 'Current Village:',
        'Min Points:': 'Min Points:',
        'Max Points:': 'Max Points:',
        'Radius:': 'Radius:',
        'Find Targets': 'Find Targets',
        Reset: 'Reset',
        'Coordinates:': 'Coordinates:',
        'Candidate barbs:': 'Candidate barbs:',
        'Excluded by LA:': 'Excluded by LA:',
        'Final targets:': 'Final targets:',
        'Status:': 'Status:',
        Ready: 'Ready',
        'Fetching village data...': 'Fetching village data...',
        'Fetching LA page list...': 'Fetching LA page list...',
        'Fetching LA pages...': 'Fetching LA pages...',
        'Building target list...': 'Building target list...',
        Finished: 'Finished',
        Type: 'Type',
        Barbarian: 'Barbarian',
        Points: 'Points',
        Distance: 'Distance',
        Actions: 'Actions',
        Scout: 'Scout',
        'No barbarian villages found!': 'No barbarian villages found!',
        '#': '#',
        'Target list cleared.': 'Target list cleared.',
        'Targets found:': 'Targets found:',
        'Attack sent:': 'Attack sent:',
        'Attack failed:': 'Attack failed:',
        Sending: 'Sending',
        'Error while fetching village.txt!': 'Error while fetching village.txt!',
        'Error while fetching LA pages!': 'Error while fetching LA pages!',
        'No targets left.': 'No targets left.',
        'No targets found.': 'No targets found.',
        'Please use the map screen.': 'Please use the map screen.',
        'Settings saved!': 'Settings saved!',
        'No target village rows available.': 'No target village rows available.',
    },
    tr_TR: {
        'Scout Barbs Not In LA': "LA'da Olmayan Barbarlara Casus",
        Help: 'Yardım',
        'This script requires PA and FA to be active!':
            'Bu script için premium ve FA aktif olmalı!',
        'Redirecting...': 'Yönlendiriliyor...',
        'Current Village:': 'Geçerli Köy:',
        'Min Points:': 'Minimum Puan:',
        'Max Points:': 'Maksimum Puan:',
        'Radius:': 'Alan:',
        'Find Targets': 'Hedefleri Bul',
        Reset: 'Sıfırla',
        'Coordinates:': 'Koordinatlar:',
        'Candidate barbs:': 'Aday barbarlar:',
        'Excluded by LA:': "LA'da olanlar:",
        'Final targets:': 'Nihai hedefler:',
        'Status:': 'Durum:',
        Ready: 'Hazır',
        'Fetching village data...': 'Köy verileri çekiliyor...',
        'Fetching LA page list...': 'LA sayfa listesi çekiliyor...',
        'Fetching LA pages...': 'LA sayfaları çekiliyor...',
        'Building target list...': 'Hedef listesi oluşturuluyor...',
        Finished: 'Tamamlandı',
        Type: 'Tür',
        Barbarian: 'Barbar',
        Points: 'Puan',
        Distance: 'Mesafe',
        Actions: 'İşlemler',
        Scout: 'Casus',
        'No barbarian villages found!': 'Barbar köy bulunamadı!',
        '#': '#',
        'Target list cleared.': 'Hedef listesi temizlendi.',
        'Targets found:': 'Bulunan hedef:',
        'Attack sent:': 'Saldırı gönderildi:',
        'Attack failed:': 'Saldırı hatası:',
        Sending: 'Gönderiliyor',
        'Error while fetching village.txt!': 'village.txt çekilirken hata oluştu!',
        'Error while fetching LA pages!': 'LA sayfaları çekilirken hata oluştu!',
        'No targets left.': 'Hedef kalmadı.',
        'No targets found.': 'Hedef bulunamadı.',
        'Please use the map screen.': 'Bu scripti harita ekranında kullan.',
        'Settings saved!': 'Ayarlar kaydedildi!',
        'No target village rows available.': 'Kullanılabilir hedef satırı yok.',
    },
};

// Init Debug
initDebug();

// Initialize Script
(function () {
    if (
        game_data.features.FarmAssistent.active &&
        game_data.features.Premium.active
    ) {
        const gameScreen = getParameterByName('screen');
        if (ALLOWED_GAME_SCREENS.includes(gameScreen)) {
            const state = readStorage(DEFAULT_STATE);
            initScoutBarbsNotInLA(state);
        } else {
            UI.InfoMessage(tt('Redirecting...'));
            window.location.assign(game_data.link_base_pure + 'map');
        }
    } else {
        UI.ErrorMessage(tt('This script requires PA and FA to be active!'));
    }
})();

// Main init
function initScoutBarbsNotInLA(store) {
    const content = prepareContent(store);
    renderUI(content);
    bindGeneralEventHandlers();
    setStatus(tt('Ready'));
}

// Prepare content
function prepareContent(store) {
    const content = `
        <div class="ra-grid ra-grid-4 ra-mb15">
            <div>
                <label for="raCurrentVillage" class="ra-label">${tt('Current Village:')}</label>
                <input type="text" id="raCurrentVillage" class="ra-input" value="${escapeHtml(
                    store.CURRENT_VILLAGE
                )}">
            </div>
            <div>
                <label for="minPoints" class="ra-label">${tt('Min Points:')}</label>
                <input type="text" id="minPoints" class="ra-input" value="${escapeHtml(
                    String(store.MIN_POINTS)
                )}">
            </div>
            <div>
                <label for="maxPoints" class="ra-label">${tt('Max Points:')}</label>
                <input type="text" id="maxPoints" class="ra-input" value="${escapeHtml(
                    String(store.MAX_POINTS)
                )}">
            </div>
            <div>
                <label for="radius_choser" class="ra-label">${tt('Radius:')}</label>
                <input type="text" id="radius_choser" class="ra-input" value="${escapeHtml(
                    String(store.RADIUS)
                )}">
            </div>
        </div>

        <div class="ra-mb15">
            <a href="javascript:void(0);" id="btnFindTargets" class="btn btn-confirm-yes">
                ${tt('Find Targets')}
            </a>
            <a href="javascript:void(0);" id="btnResetTargets" class="btn btn-confirm-no">
                ${tt('Reset')}
            </a>
        </div>

        <div class="ra-grid ra-grid-4 ra-mb15">
            <div><strong>${tt('Candidate barbs:')}</strong> <span id="candidateCount">0</span></div>
            <div><strong>${tt('Excluded by LA:')}</strong> <span id="excludedCount">0</span></div>
            <div><strong>${tt('Final targets:')}</strong> <span id="finalCount">0</span></div>
            <div><strong>${tt('Status:')}</strong> <span id="scriptStatus">${tt(
                'Ready'
            )}</span></div>
        </div>

        <div class="ra-mb15">
            <label for="targetCoordsList" class="ra-label">${tt('Coordinates:')}</label>
            <textarea id="targetCoordsList" class="ra-textarea" readonly></textarea>
        </div>

        <div id="targetsTableWrapper" class="ra-table-container" style="display:none;"></div>
    `;

    return content;
}

// Render UI
function renderUI(body) {
    const content = `
        <div class="ra-scout-barbs-gaps" id="raScoutBarbsGaps">
            <div class="ra-scout-barbs-gaps-header">
                <h3>${tt(scriptData.name)}</h3>
            </div>
            <div class="ra-scout-barbs-gaps-body">
                ${body}
            </div>
            <div class="ra-scout-barbs-gaps-footer">
                <small>
                    <strong>${tt(scriptData.name)} ${scriptData.version}</strong>
                </small>
            </div>
        </div>
        <style>
            .ra-scout-barbs-gaps { position: relative; display: block; width: 100%; height: auto; clear: both; margin: 10px 0 15px; border: 1px solid #603000; box-sizing: border-box; background: #f4e4bc; }
            .ra-scout-barbs-gaps * { box-sizing: border-box; }
            .ra-scout-barbs-gaps > div { padding: 10px; }
            .ra-scout-barbs-gaps-header { display:flex; align-items:center; justify-content:space-between; background-color:#c1a264 !important; background-image:url(/graphic/screen/tableheader_bg3.png); background-repeat:repeat-x; }
            .ra-scout-barbs-gaps-header h3 { margin:0; padding:0; line-height:1; }
            .ra-scout-barbs-gaps-body p { font-size:14px; }

            .ra-grid { display:grid; gap:15px; }
            .ra-grid-4 { grid-template-columns:1fr 1fr 1fr 1fr; }
            .ra-label { display:block; font-weight:600; margin-bottom:5px; }
            .ra-input { padding:5px; width:100%; display:block; line-height:1; font-size:14px; }
            .ra-textarea { width:100%; height:80px; resize:none; }
            .ra-mb15 { margin-bottom:15px; }

            .ra-table-container { overflow-y:auto; overflow-x:hidden; height:auto; max-height:360px; border:1px solid #bc6e1f; }
            .ra-table { border-collapse:collapse; }
            .ra-table th { font-size:14px; }
            .ra-table th, .ra-table td { padding:4px; text-align:center; }
            .ra-table td a { word-break:break-all; }
            .ra-table tr:nth-of-type(2n) td { background-color:#f0e2be; }
            .ra-table tr:nth-of-type(2n+1) td { background-color:#fff5da; }

            .already-sent-command { opacity:0.6; }
            .ra-scout-btn.is-sending { pointer-events:none; opacity:0.7; }
            .ra-scout-btn.is-error { pointer-events:auto; }
            .ra-row-error td { background-color:#f4c7c7 !important; }

            @media (max-width: 900px) {
                .ra-grid-4 { grid-template-columns:1fr 1fr; }
            }

            @media (max-width: 520px) {
                .ra-grid-4 { grid-template-columns:1fr; }
            }
        </style>
    `;

    if (jQuery('#raScoutBarbsGaps').length < 1) {
        jQuery('#contentContainer').prepend(content);
    } else {
        jQuery('#raScoutBarbsGaps .ra-scout-barbs-gaps-body').html(body);
    }
}

// Bind general events
function bindGeneralEventHandlers() {
    jQuery('#btnFindTargets')
        .off('click.raScoutGaps')
        .on('click.raScoutGaps', async function (e) {
            e.preventDefault();
            await handleFindTargets();
        });

    jQuery('#btnResetTargets')
        .off('click.raScoutGaps')
        .on('click.raScoutGaps', function (e) {
            e.preventDefault();
            resetTargetsUI();
        });

    bindAttackEventHandlers();
}

// Find targets
async function handleFindTargets() {
    const $btn = jQuery('#btnFindTargets');
    const currentVillage = jQuery('#raCurrentVillage').val().trim();
    const minPoints = parseInt(jQuery('#minPoints').val().trim(), 10);
    const maxPoints = parseInt(jQuery('#maxPoints').val().trim(), 10);
    const radius = parseFloat(jQuery('#radius_choser').val().trim());

    if (!COORDS_REGEX.test(currentVillage)) {
        UI.ErrorMessage('Invalid current village coordinate!');
        return;
    }
    if (Number.isNaN(minPoints) || Number.isNaN(maxPoints) || Number.isNaN(radius)) {
        UI.ErrorMessage('Invalid filter input!');
        return;
    }

    saveState({
        CURRENT_VILLAGE: currentVillage,
        MIN_POINTS: minPoints,
        MAX_POINTS: maxPoints,
        RADIUS: radius,
    });

    $btn.addClass('btn-disabled');
    try {
        setStatus(tt('Fetching village data...'));

        const villageTxt = await fetchVillageDataCached();
        const villages = CSVToArray(villageTxt).filter((row) => row && row.length >= 6);

        setStatus(tt('Fetching LA page list...'));
        const laAjaxUrls = await getLAAjaxPageUrls();

        setStatus(tt('Fetching LA pages...'));
        const laCoords = await fetchAllLACoordinates(laAjaxUrls);
        CURRENT_LA_COORDS = laCoords;

        setStatus(tt('Building target list...'));

        const barbarians = villages.filter((village) => parseInt(village[4], 10) === 0);

        const candidates = barbarians
            .map((village) => {
                const coord = village[2] + '|' + village[3];
                const points = parseInt(village[5], 10);
                const distance = calculateDistance(currentVillage, coord);

                return {
                    villageId: parseInt(village[0], 10),
                    coord: coord,
                    x: parseInt(village[2], 10),
                    y: parseInt(village[3], 10),
                    points: points,
                    distance: distance,
                };
            })
            .filter((barbarian) => {
                return (
                    barbarian.points >= minPoints &&
                    barbarian.points <= maxPoints &&
                    barbarian.distance <= radius
                );
            })
            .sort((a, b) => a.distance - b.distance);

        const finalTargets = candidates.filter((barbarian) => !laCoords.has(barbarian.coord));

        CURRENT_RESULTS = finalTargets;
        CURRENT_RESULT_COORDS = finalTargets.map((item) => item.coord);

        jQuery('#candidateCount').text(candidates.length);
        jQuery('#excludedCount').text(candidates.length - finalTargets.length);
        jQuery('#finalCount').text(finalTargets.length);
        jQuery('#targetCoordsList').val(CURRENT_RESULT_COORDS.join(' '));

        if (finalTargets.length > 0) {
            const tableHtml = buildTargetsTable(finalTargets);
            jQuery('#targetsTableWrapper').html(tableHtml).show();
            bindAttackEventHandlers();
            setStatus(`${tt('Finished')} — ${tt('Targets found:')} ${finalTargets.length}`);
        } else {
            jQuery('#targetsTableWrapper').hide().empty();
            setStatus(tt('No targets found.'));
            UI.InfoMessage(tt('No targets found.'));
        }
    } catch (error) {
        setStatus('Error');
        UI.ErrorMessage(error && error.message ? error.message : tt('There was an error!'));
        console.error(`${scriptInfo()} Error:`, error);
    } finally {
        $btn.removeClass('btn-disabled');
    }
}

// Reset UI
function resetTargetsUI() {
    CURRENT_RESULTS = [];
    CURRENT_RESULT_COORDS = [];
    CURRENT_LA_COORDS = new Set();

    BACKGROUND_ATTACK_STATE.enterHeld = false;
    BACKGROUND_ATTACK_STATE.enterLoopRunning = false;
    BACKGROUND_ATTACK_STATE.attackBusy = false;
    BACKGROUND_ATTACK_STATE.stopReason = null;
    BACKGROUND_ATTACK_STATE.enterKeyActive = false;

    jQuery('#candidateCount').text('0');
    jQuery('#excludedCount').text('0');
    jQuery('#finalCount').text('0');
    jQuery('#targetCoordsList').val('');
    jQuery('#targetsTableWrapper').hide().empty();
    setStatus(tt('Target list cleared.'));
}

// Build table
function buildTargetsTable(targets) {
    let html = `
        <table class="ra-table" width="100%">
            <thead>
                <tr>
                    <th>${tt('#')}</th>
                    <th>${tt('Barbarian')}</th>
                    <th>${tt('Points')}</th>
                    <th>${tt('Distance')}</th>
                    <th>${tt('Actions')}</th>
                </tr>
            </thead>
            <tbody>
    `;

    targets.forEach((target, index) => {
        const villageUrl = `${game_data.link_base_pure}info_village&id=${target.villageId}`;
        const commandUrl = `${game_data.link_base_pure}place&target=${target.villageId}&spy=1`;

        html += `
            <tr data-target-id="${target.villageId}" data-target-coord="${escapeHtml(
            target.coord
        )}">
                <td>${index + 1}</td>
                <td>
                    <a href="${villageUrl}" target="_blank" rel="noopener noreferrer">
                        ${escapeHtml(target.coord)}
                    </a>
                </td>
                <td>${target.points}</td>
                <td>${target.distance.toFixed(2)}</td>
                <td>
                    <a href="${commandUrl}"
                       data-command-url="${commandUrl}"
                       data-target-id="${target.villageId}"
                       data-target-coord="${escapeHtml(target.coord)}"
                       class="ra-scout-btn btn"
                       target="_blank"
                       rel="noopener noreferrer">
                        ${tt('Scout')}
                    </a>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    return html;
}

// Bind attack handlers
function bindAttackEventHandlers() {
    jQuery('.ra-scout-btn')
        .off('click.raScoutGaps')
        .on('click.raScoutGaps', function (e) {
            e.preventDefault();
            sendBackgroundScout(jQuery(this));
        });

    jQuery(document)
        .off('keydown.raScoutGaps')
        .on('keydown.raScoutGaps', function (event) {
            const code = event.keyCode || event.which;
            const tagName = (event.target && event.target.tagName
                ? event.target.tagName
                : ''
            ).toLowerCase();

            if (code !== 13) return;
            if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
                return;
            }

            event.preventDefault();

            if (BACKGROUND_ATTACK_STATE.enterKeyActive) {
                return;
            }

            BACKGROUND_ATTACK_STATE.enterKeyActive = true;
            BACKGROUND_ATTACK_STATE.enterHeld = true;
            BACKGROUND_ATTACK_STATE.stopReason = null;
            processEnterHoldQueue();
        });

    jQuery(document)
        .off('keyup.raScoutGaps')
        .on('keyup.raScoutGaps', function (event) {
            const code = event.keyCode || event.which;
            if (code === 13) {
                BACKGROUND_ATTACK_STATE.enterHeld = false;
                BACKGROUND_ATTACK_STATE.enterKeyActive = false;
            }
        });
}

// Continuous enter hold
async function processEnterHoldQueue() {
    if (BACKGROUND_ATTACK_STATE.enterLoopRunning) return;

    BACKGROUND_ATTACK_STATE.enterLoopRunning = true;
    try {
        while (BACKGROUND_ATTACK_STATE.enterHeld) {
            if (BACKGROUND_ATTACK_STATE.attackBusy) {
                await sleep(40);
                continue;
            }

            const $nextButton = getNextScoutButton();
            if (!$nextButton.length) {
                BACKGROUND_ATTACK_STATE.enterHeld = false;
                UI.InfoMessage(tt('No targets left.'));
                setStatus(tt('No targets left.'));
                break;
            }

            const success = await sendBackgroundScout($nextButton);
            if (!success) {
                BACKGROUND_ATTACK_STATE.enterHeld = false;
                break;
            }

            await sleep(25);
        }
    } finally {
        BACKGROUND_ATTACK_STATE.enterLoopRunning = false;
    }
}

// Next button
function getNextScoutButton() {
    return jQuery('.ra-scout-btn')
        .not('.is-error')
        .not('.is-sending')
        .filter(':visible')
        .first();
}

// Background scout send
async function sendBackgroundScout($button) {
    if (!$button || !$button.length) return false;
    if (BACKGROUND_ATTACK_STATE.attackBusy) return false;

    if (typeof Accountmanager === 'undefined') {
        window.Accountmanager = {};
    }
    if (typeof Accountmanager.farm === 'undefined') {
        Accountmanager.farm = {};
    }

    const elapsed = typeof Timing !== 'undefined' && Timing.getElapsedTimeSinceLoad
        ? Timing.getElapsedTimeSinceLoad()
        : Date.now();

    if (
        Accountmanager.farm.last_click &&
        elapsed - Accountmanager.farm.last_click < 200
    ) {
        return false;
    }

    Accountmanager.farm.last_click = elapsed;
    BACKGROUND_ATTACK_STATE.attackBusy = true;

    const targetCoord = String($button.data('target-coord') || '');
    const targetId = String($button.data('target-id') || '');
    const commandUrl = String($button.data('command-url') || '');

    try {
        if (!commandUrl) {
            throw new Error('Command URL not found.');
        }

        const parsedCoord = parseCoord(targetCoord);

        $button.addClass('is-sending');
        $button.text(tt('Sending'));
        setStatus(`${tt('Sending')} ${targetCoord}`);

        const placeHtml = await requestPage(commandUrl, 'GET');
        const placeDoc = htmlToDocument(placeHtml);
        const $placeDoc = jQuery(placeDoc);

        const placeError = extractErrorMessage($placeDoc);
        if (placeError) {
            throw new Error(placeError);
        }

        const placeForm = findPlaceCommandForm($placeDoc);
        if (!placeForm.length) {
            throw new Error('Place form not found.');
        }

        const placeSubmit = findAttackSubmit(placeForm);
        if (!placeSubmit.length) {
            throw new Error('Attack submit button not found on place page.');
        }

        const placeAction = getAbsoluteFormAction(placeForm);
        const placePayload = serializeFormWithSubmit(placeForm, placeSubmit);
        applyTargetToPlacePayload(placePayload, parsedCoord, targetId);
        applyScoutOnlyToPlacePayload(placePayload);

        const confirmHtml = await requestPage(
            placeAction,
            'POST',
            placePayload.toString()
        );
        const confirmDoc = htmlToDocument(confirmHtml);
        const $confirmDoc = jQuery(confirmDoc);

        const confirmError = extractErrorMessage($confirmDoc);
        if (confirmError) {
            throw new Error(confirmError);
        }

        const confirmForm = findConfirmForm($confirmDoc);
        if (!confirmForm.length) {
            throw new Error('Confirm form not found.');
        }

        const confirmSubmit = findConfirmSubmit(confirmForm);
        if (!confirmSubmit.length) {
            throw new Error('Final confirm button not found.');
        }

        const confirmAction = getAbsoluteFormAction(confirmForm);
        const confirmPayload = serializeFormWithSubmit(confirmForm, confirmSubmit);

        const finalHtml = await requestPage(
            confirmAction,
            'POST',
            confirmPayload.toString()
        );
        const finalDoc = htmlToDocument(finalHtml);
        const $finalDoc = jQuery(finalDoc);

        const finalError = extractErrorMessage($finalDoc);
        const stillOnConfirm = findConfirmForm($finalDoc).length > 0;

        if (finalError) {
            throw new Error(finalError);
        }

        if (stillOnConfirm) {
            throw new Error('Attack remained on confirm screen.');
        }

        handleSuccessfulScout($button, targetCoord);
        return true;
    } catch (error) {
        handleFailedScout($button, targetCoord, error);
        return false;
    } finally {
        BACKGROUND_ATTACK_STATE.attackBusy = false;
    }
}

// Success
function handleSuccessfulScout($button, targetCoord) {
    const $row = $button.closest('tr');

    $button.removeClass('is-sending is-error');
    $button.addClass('btn-confirm-yes');
    $row.addClass('already-sent-command');

    UI.SuccessMessage(`${tt('Attack sent:')} ${targetCoord}`);

    $row.remove();
    removeCoordFromCurrentResults(targetCoord);
    updateRemainingCount();
    setStatus(`${tt('Attack sent:')} ${targetCoord}`);
}

// Failure
function handleFailedScout($button, targetCoord, error) {
    const $row = $button.closest('tr');
    const message =
        error && error.message ? error.message : 'Unknown background send error.';

    $button.removeClass('is-sending');
    $button.addClass('is-error');
    $button.text(tt('Scout'));
    $row.addClass('ra-row-error');

    BACKGROUND_ATTACK_STATE.stopReason = message;
    BACKGROUND_ATTACK_STATE.enterHeld = false;

    UI.ErrorMessage(`${tt('Attack failed:')} ${targetCoord} — ${message}`);
    setStatus(`${tt('Attack failed:')} ${targetCoord}`);
    console.error(`${scriptInfo()} Background scout failed for ${targetCoord}:`, error);
}

// Remove coord from current results
function removeCoordFromCurrentResults(coord) {
    CURRENT_RESULTS = CURRENT_RESULTS.filter((item) => item.coord !== coord);
    CURRENT_RESULT_COORDS = CURRENT_RESULT_COORDS.filter((item) => item !== coord);
    jQuery('#targetCoordsList').val(CURRENT_RESULT_COORDS.join(' '));
}

// Update count
function updateRemainingCount() {
    const count = jQuery('.ra-scout-btn').length;
    jQuery('#finalCount').text(count);
}

// Set status
function setStatus(text) {
    jQuery('#scriptStatus').text(text);
}

// Find place form
function findPlaceCommandForm($doc) {
    return $doc.find('form#command-data-form, form[name="units"]').first();
}

// Find attack submit
function findAttackSubmit($form) {
    let $submit = $form.find('input[name="attack"], button[name="attack"]').first();

    if (!$submit.length) {
        $submit = $form.find('#command_actions input.btn-attack[name], #command_actions button.btn-attack[name]').first();
    }

    if (!$submit.length) {
        $submit = $form
            .find('input[type="submit"][value*="Attack"], input[type="submit"][value*="attack"]')
            .first();
    }

    return $submit;
}

// Find confirm form
function findConfirmForm($doc) {
    return $doc
        .find('form')
        .filter(function () {
            return jQuery(this).find('input[name="submit_confirm"], button[name="submit_confirm"]').length > 0;
        })
        .first();
}

// Find confirm submit
function findConfirmSubmit($form) {
    return $form.find('input[name="submit_confirm"], button[name="submit_confirm"]').first();
}

// HTML to document
function htmlToDocument(html) {
    return new DOMParser().parseFromString(html, 'text/html');
}

// Decode HTML entities
function decodeHtmlEntities(value) {
    return jQuery('<textarea/>').html(value || '').text();
}

// Absolute form action
function getAbsoluteFormAction($form) {
    const rawAction = $form.attr('action') || '';
    return new URL(decodeHtmlEntities(rawAction), window.location.origin).toString();
}

// Serialize form
function serializeFormWithSubmit($form, $submit) {
    const params = new URLSearchParams();

    $form.find('input, select, textarea').each(function () {
        const el = this;
        const $el = jQuery(el);
        const name = $el.attr('name');

        if (!name || el.disabled) return;

        const tagName = (el.tagName || '').toLowerCase();
        const type = (($el.attr('type') || '') + '').toLowerCase();

        if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') {
            return;
        }

        if ((type === 'checkbox' || type === 'radio') && !el.checked) {
            return;
        }

        if (tagName === 'select' && el.multiple) {
            jQuery(el)
                .find('option:selected')
                .each(function () {
                    params.append(name, jQuery(this).val());
                });
            return;
        }

        params.append(name, $el.val());
    });

    if ($submit && $submit.length) {
        const submitName = $submit.attr('name');
        if (submitName) {
            params.append(submitName, $submit.val() || '1');
        }
    }

    return params;
}

// Parse coord
function parseCoord(coordText) {
    const match = String(coordText || '').match(/^(\d{1,3})\|(\d{1,3})$/);

    if (!match) {
        throw new Error('Invalid target coordinate: ' + coordText);
    }

    return {
        x: match[1],
        y: match[2],
        text: `${match[1]}|${match[2]}`,
    };
}

// Set or append param
function setOrAppendParam(params, name, value) {
    params.delete(name);
    params.append(name, value);
}

// Apply target
function applyTargetToPlacePayload(params, coord, targetId) {
    setOrAppendParam(params, 'x', coord.x);
    setOrAppendParam(params, 'y', coord.y);
    setOrAppendParam(params, 'input', coord.text);
    setOrAppendParam(params, 'target_type', 'coord');

    if (targetId) {
        setOrAppendParam(params, 'target', targetId);
    }
}

// Apply 1 spy only
function applyScoutOnlyToPlacePayload(params) {
    const unitNames = [
        'spear',
        'sword',
        'axe',
        'archer',
        'spy',
        'light',
        'marcher',
        'heavy',
        'ram',
        'catapult',
        'knight',
        'snob',
        'militia',
    ];

    unitNames.forEach((unit) => {
        if (unit === 'spy') {
            setOrAppendParam(params, unit, '1');
        } else {
            setOrAppendParam(params, unit, '0');
        }
    });
}

// Extract error message
function extractErrorMessage($doc) {
    const selectors = [
        '.error_box',
        '.error',
        '#error',
        '.warning',
        '.warn_box',
    ];

    for (let i = 0; i < selectors.length; i++) {
        const $node = $doc.find(selectors[i]).first();
        const text = $node.text().replace(/\s+/g, ' ').trim();
        if (text) {
            return text;
        }
    }

    return '';
}

// Request page
async function requestPage(url, method, body) {
    const options = {
        method: method || 'GET',
        credentials: 'same-origin',
        headers: {},
    };

    if (method === 'POST') {
        options.headers['Content-Type'] =
            'application/x-www-form-urlencoded; charset=UTF-8';
        options.body = body || '';
    }

    const response = await fetch(url, options);
    return await response.text();
}

// Fetch cached village.txt
async function fetchVillageDataCached() {
    const cachedTime = parseInt(localStorage.getItem(VILLAGE_CACHE_TIME_KEY) || '0', 10);
    const cachedData = localStorage.getItem(VILLAGE_CACHE_KEY);
    const now = Date.now();

    if (cachedData && cachedTime && now - cachedTime < VILLAGE_CACHE_TTL) {
        return cachedData;
    }

    const data = await jQuery.get('/map/village.txt').catch((error) => {
        throw new Error(tt('Error while fetching village.txt!'));
    });

    localStorage.setItem(VILLAGE_CACHE_KEY, data);
    localStorage.setItem(VILLAGE_CACHE_TIME_KEY, String(now));

    return data;
}

// Get LA ajax page URLs
async function getLAAjaxPageUrls() {
    const response = await jQuery.get(game_data.link_base_pure + 'am_farm').catch((error) => {
        throw new Error(tt('Error while fetching LA pages!'));
    });

    const htmlDoc = jQuery.parseHTML(response);
    const $doc = jQuery(htmlDoc);
    const pageItems = $doc.find('#plunder_list_nav a.paged-nav-item, #plunder_list_nav strong.paged-nav-item');
    const pageNumbers = [];

    pageItems.each(function () {
        const txt = jQuery(this).text().replace(/\D/g, '');
        if (txt.length) {
            pageNumbers.push(parseInt(txt, 10));
        }
    });

    let maxPage = 0;
    if (pageNumbers.length) {
        maxPage = Math.max.apply(null, pageNumbers) - 1;
        if (maxPage < 0) maxPage = 0;
    }

    const urls = [];
    for (let i = 0; i <= maxPage; i++) {
        urls.push(
            game_data.link_base_pure +
                `am_farm&ajax=page_entries&Farm_page=${i}&class=&extended=1&order=distance&dir=asc`
        );
    }

    return urls;
}

// Fetch all LA coords
async function fetchAllLACoordinates(urls) {
    const coords = new Set();

    if (!urls || !urls.length) {
        return coords;
    }

    await new Promise((resolve, reject) => {
        jQuery.fetchAll(
            urls,
            function (index, data) {
                const response = normalizeLAAjaxResponse(data);
                const plunderList = response && response.plunder_list ? response.plunder_list : [];

                plunderList.forEach((rowHtml) => {
                    const match = String(rowHtml).match(COORDS_REGEX);
                    if (match && match[0]) {
                        coords.add(match[0]);
                    }
                });
            },
            function () {
                resolve();
            },
            function (error) {
                reject(new Error(tt('Error while fetching LA pages!')));
            }
        );
    });

    return coords;
}

// Normalize LA response
function normalizeLAAjaxResponse(data) {
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (e) {
            return {};
        }
    }

    return data || {};
}

// Sequential GET helper
jQuery.fetchAll = function (urls, onLoad, onDone, onError) {
    var numDone = 0;
    var lastRequestTime = 0;
    var minWaitTime = 200;

    loadNext();

    function loadNext() {
        if (numDone === urls.length) {
            onDone();
            return;
        }

        let now = Date.now();
        let timeElapsed = now - lastRequestTime;

        if (timeElapsed < minWaitTime) {
            let timeRemaining = minWaitTime - timeElapsed;
            setTimeout(loadNext, timeRemaining);
            return;
        }

        lastRequestTime = now;
        jQuery
            .get(urls[numDone])
            .done((data) => {
                try {
                    onLoad(numDone, data);
                    ++numDone;
                    loadNext();
                } catch (e) {
                    onError(e);
                }
            })
            .fail((xhr) => {
                onError(xhr);
            });
    }
};

// CSV parser
function CSVToArray(strData, strDelimiter) {
    strDelimiter = strDelimiter || ',';
    var objPattern = new RegExp(
        '(\\' +
            strDelimiter +
            '|\\r?\\n|\\r|^)' +
            '(?:"([^"]*(?:""[^"]*)*)"|' +
            '([^"\\' +
            strDelimiter +
            '\\r\\n]*))',
        'gi'
    );
    var arrData = [[]];
    var arrMatches = null;

    while ((arrMatches = objPattern.exec(strData))) {
        var strMatchedDelimiter = arrMatches[1];

        if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
            arrData.push([]);
        }

        var strMatchedValue;
        if (arrMatches[2]) {
            strMatchedValue = arrMatches[2].replace(new RegExp('""', 'g'), '"');
        } else {
            strMatchedValue = arrMatches[3];
        }

        arrData[arrData.length - 1].push(strMatchedValue);
    }

    return arrData;
}

// Distance
function calculateDistance(from, to) {
    const source = String(from).match(/(\d+)\|(\d+)/);
    const target = String(to).match(/(\d+)\|(\d+)/);

    if (!source || !target) return Infinity;

    return Math.sqrt(
        Math.pow(parseInt(source[1], 10) - parseInt(target[1], 10), 2) +
            Math.pow(parseInt(source[2], 10) - parseInt(target[2], 10), 2)
    );
}

// Save state
function saveState(data) {
    writeStorage(data, readStorage(DEFAULT_STATE));
}

// Read storage
function readStorage(defaultState) {
    let storedState = sessionStorage.getItem(STORAGE_KEY);
    if (!storedState) return defaultState;
    if (typeof storedState === 'object') return defaultState;
    storedState = JSON.parse(storedState);
    return storedState;
}

// Write storage
function writeStorage(data, initialState) {
    const dataToBeSaved = {
        ...initialState,
        ...data,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToBeSaved));
}

// Sleep
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Escape html
function escapeHtml(string) {
    return String(string)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Get parameter
function getParameterByName(name, url = window.location.href) {
    return new URL(url).searchParams.get(name);
}

// Script info
function scriptInfo() {
    return `[${scriptData.name} ${scriptData.version}]`;
}

// Debug
function initDebug() {
    console.debug(`${scriptInfo()} It works 🚀!`);
    if (DEBUG) {
        console.debug(`${scriptInfo()} Market:`, game_data.market);
        console.debug(`${scriptInfo()} World:`, game_data.world);
        console.debug(`${scriptInfo()} Screen:`, game_data.screen);
        console.debug(`${scriptInfo()} Game Version:`, game_data.majorVersion);
        console.debug(`${scriptInfo()} Game Build:`, game_data.version);
        console.debug(`${scriptInfo()} Locale:`, game_data.locale);
        console.debug(`${scriptInfo()} Premium:`, game_data.features.Premium.active);
        console.debug(`${scriptInfo()} FarmAssistant:`, game_data.features.FarmAssistent.active);
    }
}

// Translator
function tt(string) {
    var gameLocale = game_data.locale;

    if (
        translations[gameLocale] !== undefined &&
        translations[gameLocale][string] !== undefined
    ) {
        return translations[gameLocale][string];
    }

    return translations['en_DK'][string] || string;
}