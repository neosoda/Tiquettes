/**
 Vpanel - Générateur d'étiquettes pour tableaux et armoires électriques
 Copyright (C) 2024-2026 Neosoda

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

'use strict'

import swbIcons from '../switchboard_icons.json';

const bool = (val, fallback) => typeof val === 'boolean' ? val : fallback;

/**
 * Applies forward-compatibility fixes to a single module object.
 * Must be called on every module when importing a project file (which may
 * originate from an older app version). Not needed for data already stored in
 * the current session, which was saved by the current version.
 */
export function migrateModule(m) {
    let nm = { ...m };

    // <=1.4.0 : remove per-module theme definition
    if (nm.theme) delete nm['theme'];

    // <=2.0.0 : back-fill coef from icon catalogue when missing
    if (nm.icon && !nm.coef) {
        const icon = swbIcons.find((si) => si.filename === nm.icon);
        if (icon) nm = { ...nm, coef: icon.coef };
    }

    // <=2.0.3
    if (!nm.half) nm = { ...nm, half: "none" };

    // <=2.2.3
    if (!nm.modtype) nm = { ...nm, modtype: "" };
    if (!nm.wire)    nm = { ...nm, wire: "" };

    // <=2.2.4
    if (!nm.grp) nm = { ...nm, grp: "" };

    // <=2.2.5
    if (!nm.line) nm = { ...nm, line: "" };

    // <=2.2.6
    if (nm.partialKc == null) nm = { ...nm, partialKc: false };

    return nm;
}

/**
 * Applies migrateModule to every module in every row.
 */
export function migrateModules(rows) {
    return rows.map((row) => row.map(migrateModule));
}

/**
 * Normalises the top-level scalar and boolean fields of a switchboard
 * object, filling in defaults for values that were absent in older versions.
 *
 * @param {object} swb  - Raw switchboard (parsed from JSON or sessionStorage).
 * @param {object} opts - Default values injected by the caller.
 */
export function migrateProjectMeta(swb, {
    theme,
    defaultDb,
    defaultProjectType,
    defaultVRef,
    defaultStepSize,
    generateUUID,
}) {
    return {
        // <1.5.0
        prjcreated: swb.prjcreated ? new Date(swb.prjcreated) : new Date(),
        prjupdated: swb.prjupdated ? new Date(swb.prjupdated) : new Date(),
        prjversion: swb.prjversion ? parseInt(swb.prjversion) : 1,

        // <2.0.0
        projectType:     swb.projectType ?? defaultProjectType,
        vref:            swb.vref ? parseInt(swb.vref) : defaultVRef,
        db:              { ...defaultDb, ...(swb.db ?? defaultDb) },
        withDb:          bool(swb.withDb, false),
        withGroundLine:  bool(swb.withGroundLine, false),
        schemaMonitor:   bool(swb.schemaMonitor, false),
        switchboardMonitor: bool(swb.switchboardMonitor, false),

        summaryColumnRow:         bool(swb.summaryColumnRow, false),
        summaryColumnPosition:    bool(swb.summaryColumnPosition, false),
        summaryColumnType:        bool(swb.summaryColumnType, true),
        summaryColumnId:          bool(swb.summaryColumnId, true),
        summaryColumnFunction:    bool(swb.summaryColumnFunction, true),
        summaryColumnLabel:       bool(swb.summaryColumnLabel, true),
        summaryColumnDescription: bool(swb.summaryColumnDescription, true),

        // <2.0.5
        stepSize: swb.stepSize ?? defaultStepSize,

        // <2.1.4
        theme,

        // <2.2.2
        prjid: swb.prjid ?? generateUUID(),
    };
}
