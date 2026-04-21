/*
 * Script Name: Scout Barbs Not In LA
 * Version: v3.0.0
 * Last Updated: 2026-04-21
 * Author: OpenAI / Custom build for Controleng
 */

/*
 javascript:$.getScript('https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/find_barbs_v3.js');
*/

var scriptData = {
    name: 'Scout Barbs Not In LA',
    version: 'v3.0.0',
    author: 'OpenAI',
    authorUrl: 'https://chatgpt.com/',
    helpLink: '#',
};

// User Input
if (typeof DEBUG !== 'boolean') DEBUG = false;

// Globals
var ALLOWED_GAME_SCREENS = ['map'];
var STORAGE_KEY = 'YAVER_SCOUT_GAPS_STORE_V3';
var DEFAULT_STATE = {
    CURRENT_VILLAGE: `${game_data.village.x}|${game_data.village.y}`,
    MIN_POINTS: 26,
    MAX_POINTS: 30000,
    RADIUS: 15,
};

var SCRIPT_STATE = {
    results: [],
    resultCoords: [],
    laCoords: new Set(),
    isFinding: false,
    candidateCount: 0,
    excludedCount: 0,
};

var BACKGROUND_ATTACK_STATE = {
    enterHeld: false,
    enterLoopRunning: false,
    attackBusy: false,
    stopReason: null,
    enterKeyActive: false,
};

var translations = {
    en_DK: {
        'Scout Barbs Not In LA': 'Scout Barbs Not In LA',
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
        'Village data loaded': 'Village data loaded',
        'Fetching LA pages...': 'Fetching LA pages...',
        'LA pages loaded': 'LA pages loaded',
        'Building target list...': 'Building target list...',
        Finished: 'Finished',
        Barbarian: 'Barbarian',
        Points: 'Points',
        Distance: 'Distance',
        Actions: 'Actions',
        Scout: 'Scout',
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
        'Invalid current village coordinate!': 'Invalid current village coordinate!',
        'Invalid filter input!': 'Invalid filter input!',
        Error: 'Error',
        'Targets are being prepared...': 'Targets are being prepared...',
        'Place form not found.': 'Place form not found.',
        'Attack submit button not found on place page.':
            'Attack submit button not found on place page.',
        'Confirm form not found.': 'Confirm form not found.',
        'Final confirm button not found.': 'Final confirm button not found.',
        'Attack remained on confirm screen.':
            'Attack remained on confirm screen.',
        'Command URL not found.': 'Command URL not found.',
        'Stopped on error': 'Stopped on error',
    },
    tr_TR: {
        'Scout Barbs Not In LA': "LA'da Olmayan Barbarlara Casus",
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
        'Village data loaded': 'Köy verisi yüklendi',
        'Fetching LA pages...': 'LA sayfaları çekiliyor...',
        'LA pages loaded': 'LA sayfaları yüklendi',
        'Building target list...': 'Hedef listesi oluşturuluyor...',
        Finished: 'Tamamlandı',
        Barbarian: 'Barbar',
        Points: 'Puan',
        Distance: 'Mesafe',
        Actions: 'İşlemler',
        Scout: 'Casus',
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
        'Invalid current village coordinate!': 'Geçerli köy koordinatı hatalı!',
        'Invalid filter input!': 'Filtre girişi hatalı!',
        Error: 'Hata',
        'Targets are being prepared...': 'Hedefler hazırlanıyor...',
        'Place form not found.': 'Place form bulunamadı.',
        'Attack submit button not found on place page.':
            'Place sayfasında saldırı butonu bulunamadı.',
        'Confirm form not found.': 'Confirm form bulunamadı.',
        'Final confirm button not found.':
            'Final confirm butonu bulunamadı.',
        'Attack remained on confirm screen.':
            'Saldırı confirm ekranında kaldı.',
        'Command URL not found.': 'Komut URL bulunamadı.',
        'Stopped on error': 'Hata nedeniyle durdu',
    },
};

initDebug();

(function () {
    if (
        game_data.features.FarmAssistent.active &&
        game_data.features.Premium.active
    ) {
        const gameScreen = getParameterByName('screen');
        if (ALLOWED_GAME_SCREENS.includes(gameScreen)) {
            const state = readStorage(DEFAULT_STATE);
            renderMainUI(state);
            bindGeneralHandlers();
            setStatus(tt('Ready'));
        } else {
            UI.InfoMessage(tt('Redirecting...'));
            window.location.assign(game_data.link_base_pure + 'map');
        }
    } else {
        UI.ErrorMessage(tt('This script requires PA and FA to be active!'));
    }
})();

function renderMainUI(store) {
    const content = `
        <div class="ra-scout-barbs-gaps" id="raScoutBarbsGaps">
            <div class="ra-scout-barbs-gaps-header">
                <h3>${tt(scriptData.name)}</h3>
            </div>
            <div class="ra-scout-barbs-gaps-body">
                <div class="ra-grid ra-grid-4 ra-mb15">
                    <div>
                        <label for="raCurrentVillage" class="ra-label">${tt(
                            'Current Village:'
                        )}</label>
                        <input type="text" id="raCurrentVillage" class="ra-input" value="${escapeHtml(
                            store.CURRENT_VILLAGE
                        )}">
                    </div>
                    <div>
                        <label for="minPoints" class="ra-label">${tt(
                            'Min Points:'
                        )}</label>
                        <input type="text" id="minPoints" class="ra-input" value="${escapeHtml(
                            String(store.MIN_POINTS)
                        )}">
                    </div>
                    <div>
                        <label for="maxPoints" class="ra-label">${tt(
                            'Max Points:'
                        )}</label>
                        <input type="text" id="maxPoints" class="ra-input" value="${escapeHtml(
                            String(store.MAX_POINTS)
                        )}">
                    </div>
                    <div>
                        <label for="radiusChooser" class="ra-label">${tt(
                            'Radius:'
                        )}</label>
                        <input type="text" id="radiusChooser" class="ra-input" value="${escapeHtml(
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
                    <label for="targetCoordsList" class="ra-label">${tt(
                        'Coordinates:'
                    )}</label>
                    <textarea id="targetCoordsList" class="ra-textarea" readonly></textarea>
                </div>

                <div id="targetsTableWrapper" class="ra-table-container" style="display:none;"></div>
            </div>
            <div class="ra-scout-barbs-gaps-footer">
                <small><strong>${tt(scriptData.name)} ${scriptData.version}</strong></small>
            </div>
        </div>

        <style>
            .ra-scout-barbs-gaps { position: relative; display: block; width: 100%; height: auto; clear: both; margin: 10px 0 15px; border: 1px solid #603000; box-sizing: border-box; background: #f4e4bc; }
            .ra-scout-barbs-gaps * { box-sizing: border-box; }
            .ra-scout-barbs-gaps > div { padding: 10px; }
            .ra-scout-barbs-gaps-header { display:flex; align-items:center; justify-content:space-between; background-color:#c1a264 !important; background-image:url(/graphic/screen/tableheader_bg3.png); background-repeat:repeat-x; }
            .ra-scout-barbs-gaps-header h3 { margin:0; padding:0; line-height:1; }

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
        jQuery('#raScoutBarbsGaps').replaceWith(content);
    }
}

function bindGeneralHandlers() {
    jQuery('#btnFindTargets')
        .off('click.raScoutGaps')
        .on('click.raScoutGaps', async function (e) {
            e.preventDefault();
            if (SCRIPT_STATE.isFinding) return;
            await findTargetsFlow();
        });

    jQuery('#btnResetTargets')
        .off('click.raScoutGaps')
        .on('click.raScoutGaps', function (e) {
            e.preventDefault();
            resetTargetsUI();
        });

    bindAttackHandlers();
}

async function findTargetsFlow() {
    SCRIPT_STATE.isFinding = true;
    const $findBtn = jQuery('#btnFindTargets');
    const currentVillage = jQuery('#raCurrentVillage').val().trim();
    const minPoints = parseInt(jQuery('#minPoints').val().trim(), 10);
    const maxPoints = parseInt(jQuery('#maxPoints').val().trim(), 10);
    const radius = parseFloat(jQuery('#radiusChooser').val().trim());

    $findBtn.addClass('btn-disabled');

    try {
        const parsedCurrentVillage = parseCoord(currentVillage);

        if (Number.isNaN(minPoints) || Number.isNaN(maxPoints) || Number.isNaN(radius)) {
            throw new Error(tt('Invalid filter input!'));
        }

        saveState({
            CURRENT_VILLAGE: parsedCurrentVillage.text,
            MIN_POINTS: minPoints,
            MAX_POINTS: maxPoints,
            RADIUS: radius,
        });

        setStatus(tt('Fetching village data...'));
        const villageTxt = await fetchVillageData();
        setStatus(tt('Village data loaded'));

        setStatus(tt('Fetching LA pages...'));
        const laCoords = await fetchLACoordinatesFromNormalPages();
        SCRIPT_STATE.laCoords = laCoords;
        setStatus(tt('LA pages loaded'));

        setStatus(tt('Building target list...'));

        const allVillages = parseVillageTxt(villageTxt);
        const candidates = buildCandidateBarbarianList(
            allVillages,
            parsedCurrentVillage.text,
            minPoints,
            maxPoints,
            radius
        );

        const finalTargets = candidates.filter((item) => !laCoords.has(item.coord));

        SCRIPT_STATE.results = finalTargets;
        SCRIPT_STATE.resultCoords = finalTargets.map((item) => item.coord);
        SCRIPT_STATE.candidateCount = candidates.length;
        SCRIPT_STATE.excludedCount = candidates.length - finalTargets.length;

        updateCounters();
        updateCoordsTextarea();

        if (!finalTargets.length) {
            jQuery('#targetsTableWrapper').hide().empty();
            setStatus(tt('No targets found.'));
            UI.InfoMessage(tt('No targets found.'));
            return;
        }

        const tableHtml = buildTargetsTable(finalTargets);
        jQuery('#targetsTableWrapper').html(tableHtml).show();

        bindAttackHandlers();
        setStatus(`${tt('Finished')} — ${tt('Targets found:')} ${finalTargets.length}`);
    } catch (error) {
        setStatus(`${tt('Error')}: ${error && error.message ? error.message : ''}`);
        UI.ErrorMessage(error && error.message ? error.message : tt('Error'));
        console.error(`${scriptInfo()} Error:`, error);
    } finally {
        SCRIPT_STATE.isFinding = false;
        $findBtn.removeClass('btn-disabled');
    }
}

function resetTargetsUI() {
    SCRIPT_STATE.results = [];
    SCRIPT_STATE.resultCoords = [];
    SCRIPT_STATE.laCoords = new Set();
    SCRIPT_STATE.candidateCount = 0;
    SCRIPT_STATE.excludedCount = 0;

    BACKGROUND_ATTACK_STATE.enterHeld = false;
    BACKGROUND_ATTACK_STATE.enterLoopRunning = false;
    BACKGROUND_ATTACK_STATE.attackBusy = false;
    BACKGROUND_ATTACK_STATE.stopReason = null;
    BACKGROUND_ATTACK_STATE.enterKeyActive = false;

    updateCounters();
    updateCoordsTextarea();
    jQuery('#targetsTableWrapper').hide().empty();
    setStatus(tt('Target list cleared.'));
}

function updateCounters() {
    jQuery('#candidateCount').text(SCRIPT_STATE.candidateCount);
    jQuery('#excludedCount').text(SCRIPT_STATE.excludedCount);
    jQuery('#finalCount').text(SCRIPT_STATE.results.length);
}

function updateCoordsTextarea() {
    jQuery('#targetCoordsList').val(SCRIPT_STATE.resultCoords.join(' '));
}

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
        const commandUrl = `${game_data.link_base_pure}place&target=${target.villageId}`;

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

    html += `</tbody></table>`;
    return html;
}

function bindAttackHandlers() {
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
            if (SCRIPT_STATE.isFinding) return;

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

async function processEnterHoldQueue() {
    if (BACKGROUND_ATTACK_STATE.enterLoopRunning) return;

    BACKGROUND_ATTACK_STATE.enterLoopRunning = true;

    try {
        while (BACKGROUND_ATTACK_STATE.enterHeld) {
            if (SCRIPT_STATE.isFinding) {
                BACKGROUND_ATTACK_STATE.enterHeld = false;
                break;
            }

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

function getNextScoutButton() {
    return jQuery('.ra-scout-btn')
        .not('.is-error')
        .not('.is-sending')
        .filter(':visible')
        .first();
}

async function sendBackgroundScout($button) {
    if (!$button || !$button.length) return false;
    if (BACKGROUND_ATTACK_STATE.attackBusy) return false;
    if (SCRIPT_STATE.isFinding) return false;

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
            throw new Error(tt('Command URL not found.'));
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
            throw new Error(tt('Place form not found.'));
        }

        const placeSubmit = findAttackSubmit(placeForm);
        if (!placeSubmit.length) {
            throw new Error(tt('Attack submit button not found on place page.'));
        }

        const placeAction = getAbsoluteFormAction(placeForm);
        const placePayload = serializeFormWithSubmit(placeForm, placeSubmit);
        applyTargetToPlacePayload(placePayload, parsedCoord, targetId);
        applyScoutOnlyToPlacePayload(placePayload);

        const confirmHtml = await requestPage(placeAction, 'POST', placePayload.toString());
        const confirmDoc = htmlToDocument(confirmHtml);
        const $confirmDoc = jQuery(confirmDoc);

        const confirmError = extractErrorMessage($confirmDoc);
        if (confirmError) {
            throw new Error(confirmError);
        }

        const confirmForm = findConfirmForm($confirmDoc);
        if (!confirmForm.length) {
            throw new Error(tt('Confirm form not found.'));
        }

        const confirmSubmit = findConfirmSubmit(confirmForm);
        if (!confirmSubmit.length) {
            throw new Error(tt('Final confirm button not found.'));
        }

        const confirmAction = getAbsoluteFormAction(confirmForm);
        const confirmPayload = serializeFormWithSubmit(confirmForm, confirmSubmit);

        const finalHtml = await requestPage(confirmAction, 'POST', confirmPayload.toString());
        const finalDoc = htmlToDocument(finalHtml);
        const $finalDoc = jQuery(finalDoc);

        const finalError = extractErrorMessage($finalDoc);
        const stillOnConfirm = findConfirmForm($finalDoc).length > 0;

        if (finalError) {
            throw new Error(finalError);
        }

        if (stillOnConfirm) {
            throw new Error(tt('Attack remained on confirm screen.'));
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

function handleSuccessfulScout($button, targetCoord) {
    const $row = $button.closest('tr');

    $button.removeClass('is-sending is-error');
    $button.addClass('btn-confirm-yes');
    $row.addClass('already-sent-command');

    UI.SuccessMessage(`${tt('Attack sent:')} ${targetCoord}`);

    removeCoordFromResults(targetCoord);
    $row.remove();

    updateCounters();
    setStatus(`${tt('Attack sent:')} ${targetCoord}`);
}

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
    setStatus(`${tt('Stopped on error')}: ${targetCoord}`);
    console.error(`${scriptInfo()} Background scout failed for ${targetCoord}:`, error);
}

function removeCoordFromResults(coord) {
    SCRIPT_STATE.results = SCRIPT_STATE.results.filter((item) => item.coord !== coord);
    SCRIPT_STATE.resultCoords = SCRIPT_STATE.resultCoords.filter((item) => item !== coord);
    updateCoordsTextarea();
}

function parseVillageTxt(villageTxt) {
    const lines = String(villageTxt || '')
        .trim()
        .split('\n');

    const villages = [];

    for (let i = 0; i < lines.length; i++) {
        const row = lines[i].split(',');
        if (row.length < 6) continue;

        villages.push({
            villageId: parseInt(row[0], 10),
            name: row[1],
            x: parseInt(row[2], 10),
            y: parseInt(row[3], 10),
            playerId: parseInt(row[4], 10),
            points: parseInt(row[5], 10),
            coord: `${row[2]}|${row[3]}`,
        });
    }

    return villages;
}

function buildCandidateBarbarianList(villages, currentVillageCoord, minPoints, maxPoints, radius) {
    return villages
        .filter((village) => village.playerId === 0)
        .filter((village) => village.points >= minPoints && village.points <= maxPoints)
        .map((village) => {
            return {
                villageId: village.villageId,
                coord: village.coord,
                x: village.x,
                y: village.y,
                points: village.points,
                distance: calculateDistance(currentVillageCoord, village.coord),
            };
        })
        .filter((village) => village.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
}

async function fetchVillageData() {
    try {
        return await jQuery.get('/map/village.txt');
    } catch (error) {
        throw new Error(tt('Error while fetching village.txt!'));
    }
}

async function fetchLACoordinatesFromNormalPages() {
    let firstPageHtml;
    try {
        firstPageHtml = await jQuery.get(game_data.link_base_pure + 'am_farm');
    } catch (error) {
        throw new Error(tt('Error while fetching LA pages!'));
    }

    const laCoords = new Set();
    extractLACoordsFromHtml(firstPageHtml, laCoords);

    const pageUrls = buildLANormalPageUrls(firstPageHtml);

    if (!pageUrls.length) {
        return laCoords;
    }

    await sequentialGetAll(
        pageUrls,
        function (index, html) {
            extractLACoordsFromHtml(html, laCoords);
        }
    ).catch(function () {
        throw new Error(tt('Error while fetching LA pages!'));
    });

    return laCoords;
}

function buildLANormalPageUrls(firstPageHtml) {
    const doc = htmlToDocument(firstPageHtml);
    const $doc = jQuery(doc);
    const urls = new Set();

    $doc.find('#plunder_list_nav a').each(function () {
        const href = jQuery(this).attr('href');
        if (!href) return;
        const absolute = new URL(decodeHtmlEntities(href), window.location.origin).toString();
        if (absolute.indexOf('screen=am_farm') !== -1) {
            urls.add(absolute);
        }
    });

    return Array.from(urls);
}

function extractLACoordsFromHtml(html, targetSet) {
    const doc = htmlToDocument(String(html || ''));
    const $doc = jQuery(doc);
    const $plunder = $doc.find('#plunder_list').first();

    if (!$plunder.length) {
        return;
    }

    const matches = ($plunder.html() || '').match(/\d{1,3}\|\d{1,3}/g) || [];
    for (let i = 0; i < matches.length; i++) {
        targetSet.add(matches[i]);
    }
}

function sequentialGetAll(urls, onLoad) {
    return new Promise(function (resolve, reject) {
        let numDone = 0;
        let lastRequestTime = 0;
        const minWaitTime = 200;

        loadNext();

        function loadNext() {
            if (numDone === urls.length) {
                resolve();
                return;
            }

            const now = Date.now();
            const timeElapsed = now - lastRequestTime;

            if (timeElapsed < minWaitTime) {
                const timeRemaining = minWaitTime - timeElapsed;
                setTimeout(loadNext, timeRemaining);
                return;
            }

            lastRequestTime = now;

            jQuery
                .get(urls[numDone])
                .done(function (data) {
                    try {
                        onLoad(numDone, data);
                        numDone++;
                        loadNext();
                    } catch (error) {
                        reject(error);
                    }
                })
                .fail(function (xhr) {
                    reject(xhr);
                });
        }
    });
}

function findPlaceCommandForm($doc) {
    return $doc.find('form#command-data-form, form[name="units"]').first();
}

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

function findConfirmForm($doc) {
    return $doc
        .find('form')
        .filter(function () {
            return jQuery(this)
                .find('input[name="submit_confirm"], button[name="submit_confirm"]')
                .length > 0;
        })
        .first();
}

function findConfirmSubmit($form) {
    return $form.find('input[name="submit_confirm"], button[name="submit_confirm"]').first();
}

function htmlToDocument(html) {
    return new DOMParser().parseFromString(html, 'text/html');
}

function decodeHtmlEntities(value) {
    return jQuery('<textarea/>').html(value || '').text();
}

function getAbsoluteFormAction($form) {
    const rawAction = $form.attr('action') || '';
    return new URL(decodeHtmlEntities(rawAction), window.location.origin).toString();
}

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

function parseCoord(coordText) {
    const match = String(coordText || '').match(/^(\d{1,3})\|(\d{1,3})$/);

    if (!match) {
        throw new Error(tt('Invalid current village coordinate!'));
    }

    return {
        x: match[1],
        y: match[2],
        text: `${match[1]}|${match[2]}`,
    };
}

function setOrAppendParam(params, name, value) {
    params.delete(name);
    params.append(name, value);
}

function applyTargetToPlacePayload(params, coord, targetId) {
    setOrAppendParam(params, 'x', coord.x);
    setOrAppendParam(params, 'y', coord.y);
    setOrAppendParam(params, 'input', coord.text);
    setOrAppendParam(params, 'target_type', 'coord');

    if (targetId) {
        setOrAppendParam(params, 'target', targetId);
    }
}

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

    for (let i = 0; i < unitNames.length; i++) {
        const unit = unitNames[i];
        if (unit === 'spy') {
            setOrAppendParam(params, unit, '1');
        } else {
            setOrAppendParam(params, unit, '0');
        }
    }
}

function extractErrorMessage($doc) {
    const selectors = ['.error_box', '.error', '#error', '.warning', '.warn_box'];

    for (let i = 0; i < selectors.length; i++) {
        const $node = $doc.find(selectors[i]).first();
        const text = $node.text().replace(/\s+/g, ' ').trim();
        if (text) {
            return text;
        }
    }

    return '';
}

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

function calculateDistance(from, to) {
    const source = String(from).match(/(\d+)\|(\d+)/);
    const target = String(to).match(/(\d+)\|(\d+)/);

    if (!source || !target) return Infinity;

    return Math.sqrt(
        Math.pow(parseInt(source[1], 10) - parseInt(target[1], 10), 2) +
            Math.pow(parseInt(source[2], 10) - parseInt(target[2], 10), 2)
    );
}

function saveState(data) {
    writeStorage(data, readStorage(DEFAULT_STATE));
}

function readStorage(defaultState) {
    let storedState = sessionStorage.getItem(STORAGE_KEY);
    if (!storedState) return defaultState;
    if (typeof storedState === 'object') return defaultState;
    storedState = JSON.parse(storedState);
    return storedState;
}

function writeStorage(data, initialState) {
    const dataToBeSaved = {
        ...initialState,
        ...data,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToBeSaved));
}

function setStatus(text) {
    jQuery('#scriptStatus').text(text);
}

function sleep(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}

function escapeHtml(string) {
    return String(string)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getParameterByName(name, url = window.location.href) {
    return new URL(url).searchParams.get(name);
}

function scriptInfo() {
    return `[${scriptData.name} ${scriptData.version}]`;
}

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

function tt(string) {
    const gameLocale = game_data.locale;
    if (
        translations[gameLocale] !== undefined &&
        translations[gameLocale][string] !== undefined
    ) {
        return translations[gameLocale][string];
    }
    return translations['en_DK'][string] || string;
}