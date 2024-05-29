import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { SearchEngine } from "./types";

export default class WebSearchSettings extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup();

    const configFile = this.dir.get_child('search-engines.json');
    const [_, bytes, __] = configFile.load_contents(null);
    const decoder = new TextDecoder();
    const engines = JSON.parse(decoder.decode(bytes)) as SearchEngine[];

    const list = new Gtk.StringList();
    engines.forEach(d => list.append(d.name));

    const settings = this.getSettings();
    const dropdown = new Adw.ComboRow({
      title: 'Engine',
      model: list,
      selected: settings.get_enum('search-engine')
    });

    group.add(dropdown);
    page.add(group);
    window.add(page);
    window._settings = settings;
    window._settings.bind('search-engine', dropdown, 'selected', Gio.SettingsBindFlags.DEFAULT)
  }
}
