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

/* eslint-disable react/prop-types */

import Popup from "./Popup.jsx";

export default function LoadingErrorPopup({ error, onCancel }) {
    const toPlainText = (value) => String(value ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();

    return <Popup
        title={"Oups !"}
        showCancelButton={false}
        showCloseButton={false}
        showOkButton={false}
        showPrevButton={false}
        showNextButton={false}
        onCancel={() => onCancel()}
    >
        <h3 style={{ margin: 0, padding: 0 }}>Huston, nous rencontrons un problème !</h3>
        <p style={{ margin: 0, marginTop: '1rem', padding: 0, whiteSpace: 'pre-line' }}>{toPlainText(error?.text ?? '')}</p>
        <p style={{ margin: 0, marginTop: '2rem', padding: 0, paddingLeft: '0.5rem', fontWeight: 600, fontSize: '105%', borderLeft: '4px solid #ccc', whiteSpace: 'pre-line' }}>{toPlainText(`${error?.message ?? '-'}`)}</p>
        <p style={{ margin: 0, marginTop: 0, padding: 0, paddingLeft: '0.5rem', fontSize: '80%', borderLeft: '4px solid #ccc', whiteSpace: 'pre-line' }}>{toPlainText(`${error?.code ?? 'UNKNOWN_ERROR'}`)}</p>
    </Popup >
}
