import Gio from 'gi://Gio';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import { SearchEngine } from './types';

interface Config {
  engine: SearchEngine;
  icon: Gio.Icon;
}

// Modified from example here: https://gjs.guide/extensions/topics/search-provider.html
class SearchProvider {
  private _extension: WebSearchExtension;
  constructor(extension: WebSearchExtension) {
    this._extension = extension;
  }

  /**
   * The application of the provider.
   *
   * Applications will return a `Gio.AppInfo` representing themselves.
   * Extensions will usually return `null`.
   *
   * @type {Gio.AppInfo}
   */
  get appInfo() {
    return null;
  }

  /**
   * Whether the provider offers detailed results.
   *
   * Applications will return `true` if they have a way to display more
   * detailed or complete results. Extensions will usually return `false`.
   *
   * @type {boolean}
   */
  get canLaunchSearch() {
    return true;
  }

  /**
   * The unique ID of the provider.
   *
   * Applications will return their application ID. Extensions will usually
   * return their UUID.
   *
   * @type {string}
   */
  get id() {
    return this._extension.uuid;
  }

  /**
   * Launch the search result.
   *
   * This method is called when a search provider result is activated.
   *
   * @param {string} result - The result identifier
   * @param {string[]} terms - The search terms
   */
  activateResult(_, terms) {
    const query = encodeURIComponent(terms.join(' '));
    const url = `${this._extension.config.engine.url}${query}`;
    const cmd = `xdg-open "${url}"`;
    Gio.AppInfo.create_from_commandline(cmd, null, 2).launch([], new Gio.AppLaunchContext());
  }

  /**
   * Launch the search provider.
   *
   * This method is called when a search provider is activated. A provider can
   * only be activated if the `appInfo` property holds a valid `Gio.AppInfo`
   * and the `canLaunchSearch` property is `true`.
   *
   * Applications will typically open a window to display more detailed or
   * complete results.
   *
   * @param {string[]} terms - The search terms
   */
  launchSearch(terms) {
  }

  /**
   * Create a result object.
   *
   * This method is called to create an actor to represent a search result.
   *
   * Implementations may return any `Clutter.Actor` to serve as the display
   * result, or `null` for the default implementation.
   *
   * @param {ResultMeta} meta - A result metadata object
   * @returns {Clutter.Actor|null} An actor for the result
   */
  createResultObject(meta) {
    return null;
  }

  /**
   * Get result metadata.
   *
   * This method is called to get a `ResultMeta` for each identifier.
   *
   * If @cancellable is triggered, this method should throw an error.
   *
   * @async
   * @param {string[]} results - The result identifiers
   * @param {Gio.Cancellable} cancellable - A cancellable for the operation
   * @returns {Promise<ResultMeta[]>} A list of result metadata objects
   */
  getResultMetas(results, cancellable) {
    console.debug(`getResultMetas([${results}])`);

    const { scaleFactor } = St.ThemeContext.get_for_stage(global.get_stage());

    return new Promise((resolve, reject) => {
      const cancelledId = cancellable.connect(
        () => reject(Error('Operation Cancelled')));

      const resultMetas = [];

      for (const identifier of results) {
        const meta = {
          id: identifier,
          name: this._extension.config.engine.name,
          description: `Search with ${this._extension.config.engine.name}`,
          createIcon: (size: number) => {
            return new St.Icon({
              gicon: this._extension.config.icon,
              width: size * scaleFactor,
              height: size * scaleFactor,
              icon_size: size * scaleFactor,
            });
          },
        };

        resultMetas.push(meta);
      }

      cancellable.disconnect(cancelledId);
      if (!cancellable.is_cancelled())
        resolve(resultMetas);
    });
  }

  /**
   * Initiate a new search.
   *
   * This method is called to start a new search and should return a list of
   * unique identifiers for the results.
   *
   * If @cancellable is triggered, this method should throw an error.
   *
   * @async
   * @param {string[]} terms - The search terms
   * @param {Gio.Cancellable} cancellable - A cancellable for the operation
   * @returns {Promise<string[]>} A list of result identifiers
   */
  getInitialResultSet(terms, cancellable) {
    return new Promise((resolve, _) => resolve(['Web Search']));
  }

  /**
   * Refine the current search.
   *
   * This method is called to refine the current search results with
   * expanded terms and should return a subset of the original result set.
   *
   * Implementations may use this method to refine the search results more
   * efficiently than running a new search, or simply pass the terms to the
   * implementation of `getInitialResultSet()`.
   *
   * If @cancellable is triggered, this method should throw an error.
   *
   * @async
   * @param {string[]} results - The original result set
   * @param {string[]} terms - The search terms
   * @param {Gio.Cancellable} cancellable - A cancellable for the operation
   * @returns {Promise<string[]>}
   */
  getSubsearchResultSet(results, terms, cancellable) {
    if (cancellable.is_cancelled()) {
      throw Error('Search Cancelled');
    }

    return this.getInitialResultSet(terms, cancellable);
  }

  /**
   * Filter the current search.
   *
   * This method is called to truncate the number of search results.
   *
   * Implementations may use their own criteria for discarding results, or
   * simply return the first n-items.
   *
   * @param {string[]} results - The original result set
   * @param {number} maxResults - The maximum amount of results
   * @returns {string[]} The filtered results
   */
  filterResults(results, maxResults) {
    if (results.length <= maxResults) {
      return results;
    }

    return results.slice(0, maxResults);
  }
}

export default class WebSearchExtension extends Extension {
  public config: Config = undefined;
  constructor(metadata) {
    super(metadata);
  }

  private setEngine() {
    const decoder = new TextDecoder();
    const configFile = this.dir.get_child('search-engines.json');
    const [_, bytes, __] = configFile.load_contents(null);
    const engines = JSON.parse(decoder.decode(bytes)) as SearchEngine[];
    const engineSetting = this.getSettings().get_int('search-engine');
    const engine = engines[engineSetting];
    const icon = Gio.icon_new_for_string(this.dir.get_path() + '/' + engine.icon);
    this.config = { engine, icon };
  }

  enable(): void {
    if (this.config == null) {
      this.setEngine();
    }

    Main.overview.searchController.addProvider(new SearchProvider(this));
  }

  disable(): void {
    this.config = undefined;
  }
}
