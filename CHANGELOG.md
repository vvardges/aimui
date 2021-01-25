# Changelog

- Improve displaying params of array type in sort box (roubkar)

## 1.3.2 Jan 22 2021
- Resolve search issue of sort box (gorarakelyan)

## 1.3.1 Jan 22 2021
- Fix Y axis scale for single value (roubkar)
- Fix issue with setting undefined pointsCount from URL (roubkar)

## 1.3.0 Jan 21 2021
- Add ability to align X axis by epoch (roubkar)
- Display experiment params with JSON tree inspector (gorarakelyan)
- Display error message when an invalid AimQL query is made (gorarakelyan)
- Add ability to order runs by metrics (roubkar)
- Add activity block to dashboard (gorarakelyan)
- Apply imperative pattern to parallel coordinates plot redraw (roubkar) 
- Add sort by filter in explore section (roubkar)
- Close select form suggestions on ESC key press (roubkar)
- Fix run navigation link issue (roubkar)
- Rerender parallel coordinates plot on chart settings update (roubkar)

## 1.2.6 Dec 29 2020
- Pick smaller range for ignoring zoom change (roubkar)

## 1.2.5 Dec 25 2020
- Apply imperative pattern to panel chart redraw (roubkar) 

## 1.2.4 Dec 25 2020
- Enable nginx gzip compression (gorarakelyan)
- Add ability to select table view mode in explore screen (gorarakelyan)
- Optimize explore panel rendering performance (roubkar)
- Add table control for selecting row height (gorarakelyan)
- Add ability to filter table columns (gorarakelyan)
- Implement autocomplete for select dropdown of explore screen (gorarakelyan)

## 1.2.3 Dec 11 2020
- Pin table column to the left when grouping by a corresponding field is applied (roubkar)
- Disable highlight mode control if metrics are aggregated (gorarakelyan)
- Apply color, stroke and grid pattern repeating logic (roubkar)
- Add ability to select mode for highlighting metric plots (roubkar)
- Enable autocomplete for grouping (gorarakelyan)

## 1.2.2 Nov 27 2020
- Add circles and interactions on parallel coordinates plot (roubkar)
- Add parallel coordinates plot chart number and config as title (roubkar)
- Recover grouping popup focus in controls sidebar after button click (roubkar)
- Make context table rows smaller (gorarakelyan)
- Display run information inside chart popup (gorarakelyan)
- Add ability to pin table columns (roubkar)
- Hide select suggestions popup on ESC (gorarakelyan)
- Hide select suggestions popup on enter (gorarakelyan)

## 1.2.1 Nov 24 2020
- Fix empty contexts comparison issue (gorarakelyan)

## 1.2.0 Nov 24 2020
- Process series with empty metric and trace data (gorarakelyan, roubkar)
- Add parallel coordinates plot for high dimensional data visualization (gorarakelyan, roubkar)
- Add Popover component to UI Kit (roubkar)
- Add ability to expand/collapse all groups in table (roubkar)

## 1.1.11 Nov 9 2020
- Display group config in a group header (roubkar, gorarakelyan)
- Sort runs by date in Dashboard screen (roubkar)
- Add offset for grouped items (roubkar)
- Add group context info to context table (roubkar)

## 1.1.10 Nov 5 2020
- Expand group and scroll to the corresponding item, when clicking on a line chart (roubkar)
- Upgrade Aim version (gorarakelyan)
- Upgrade AimRecords version (gorarakelyan)

## 1.1.9 Nov 2 2020
- Show when run was started in experiment screen (gorarakelyan)
- Add Table component to UI Kit (roubkar)

## 1.1.8 Oct 5 2020
- Return searchInput property of HubMainScreen state (gorarakelyan)

## 1.1.7 Oct 5 2020
- Update web page title (gorarakelyan)

## 1.1.6 Oct 2 2020
- Make explore panel resizable (roubkar, gorarakelyan)
- Disable processes module (gorarakelyan)

## 1.1.5 Sep 27 2020
- Add sidebar submenu (gorarakelyan)
- Add tooltips to table column actions (roubkar)
- Recover explore panel last config when navigating from sidebar (roubkar)
- Add reset controls option (roubkar)

## 1.1.4 Sep 22 2020
- Add dashboard URL update listener (gorarakelyan)
- Add Tooltip component to UI kit (roubkar)

## 1.1.3 Sep 21 2020
- Add runs dashboard (gorarakelyan, roubkar)

## 1.1.2 Sep 13 2020
- Show empty experiment message (gorarakelyan)

## 1.1.1 Sep 12 2020
- Hide processes icon from left sidebar (gorarakelyan)

## 1.1.0 Sep 8 2020
- Implement runs grouping and aggregation (roubkar, gorarakelyan)

## 1.0.14 Aug 26 2020
- Add ability to archive/unarchive runs (gorarakelyan)

## 1.0.13 Aug 21 2020
- Fix panel canvas height issue (gorarakelyan)

## 1.0.12 Aug 21 2020
- Parse nested dictionary of parameters (gorarakelyan)
- Add context area hover and click interactions (gorarakelyan)
- Add ability to remove bottom outliers (gorarakelyan)
- Add ability to remove outliers (roubkar)

## 1.0.11 Aug 15 2020
- Fix panel height issue (gorarakelyan)

## 1.0.10 Aug 14 2020
- Integrate runs search powered by AimQL (gorarakelyan)

## 1.0.9 Jul 29 2020
- Add segments integration (gorarakelyan)

## 1.0.8 Jul 24 2020
- Fix projects blueprint endpoints (gorarakelyan)
- Make table header stick to the top of context area (gorarakelyan)

## 1.0.7 Jul 23 2020
- Fix tf summary loading alert in Panel (gorarakelyan)

## 1.0.6 Jul 23 2020
- Get rid of index run of experiment (gorarakelyan)
- Ability to navigate to tf logs screen from main sidebar (gorarakelyan)
- Ability to list and edit parameters of attached TF Summary logs (gorarakelyan)
- Fix panel URL state management issue (gorarakelyan)
- Add search bar icon on panel page main search bar (gorarakelyan)
- Add tf.summary adapter to featch and show logged scalars (gorarakelyan)
- Show tags in related experiment detail screen (jialin-wu-02)
- Display Information on Navbar (jialin-wu-02)
- Add Status Indicator to Sidebar (jialin-wu-02)

## 1.0.5 Jul 18 2020
- Show information about tf.summary scalars in context area (gorarakelyan)
- Render tf.summary scalars on chart area (gorarakelyan)
- Add tf.summary adapter for reading logs (gorarakelyan)

## 1.0.4 Jul 13 2020
- Ability to recover panel state from URL (gorarakelyan)
- Add ability to filter runs by a parameter (gorarakelyan)

## 1.0.3 Jul 8 2020
- Integrate GA (gorarakelyan)

## 1.0.2 Jul 7 2020
- Add ability to go to create tag screen from panel popup (gorarakelyan)
- Show runs parameters in context area (gorarakelyan)
- Add ability to set Y axis scale function (gorarakelyan)
- Move chart hover tooltip information to context area (gorarakelyan)
- Change the panel structure to be wider and become the primary space (gorarakelyan)

## 1.0.1 Jun 22 2020
- Save experiment name in commit table when attaching a tag (gorarakelyan)

## 1.0.0 Jun 18 2020
- Ability to select and attach a tag to a training run from popup (gorarakelyan)
- Implement tags list screen to retrieve and show added tags (gorarakelyan)
- Add ability to create a new tag (gorarakelyan)
- Navigate to process screen from control panel (gorarakelyan)
- Add executed processes history and detail screen (gorarakelyan)
- Add executable template detail screen (gorarakelyan)
- Show executed process status in control panel and add ability to kill it (gorarakelyan)
- Execute training from template connected to a commit of specific experiment (gorarakelyan)
- Show training commit info inside popup: message, date, experiment (gorarakelyan)
- Ability to run training tracked with aim from executable tpl (gorarakelyan)
- Start a training from saved template (gorarakelyan)
- Ability to kill a running process from control panel (gorarakelyan)
- Show running process in control panel (gorarakelyan)
- Add executable run API method (gorarakelyan)
- Add executable create API method (gorarakelyan)
- Add ability to execute a process on the host (gorarakelyan)
- Ability to select and plot specific metric (gorarakelyan)
- Smoothen line charts by rendering each Nth value (gorarakelyan)
- Make trainings differentiable from each other by tag color (gorarakelyan)
- Show chart lines values inside popup when hovering on chart area (gorarakelyan)
- Add ability to open training detail screen from popup (gorarakelyan)
- Add Ability to search commits by tag name (gorarakelyan)
- Show commit tags inside popup (gorarakelyan)
- Control panel skeleton (gorarakelyan)
- Add ability to receive port as an argument (gorarakelyan)

## 0.1.2 Apr 16 2020
- Integrate aimrecords storage (gorarakelyan)
- Start Tornado WebSocket server with supervisor (gorarakelyan)
- Add real time update to metrics (gorarakelyan)
- Add group line charts plot insight (gorarakelyan)

## 0.1.1 Mar 14 2020
- Send subscription event after conn init (gorarakelyan)
- Remove real time update for non-index experiment (gorarakelyan)

## 0.1.0 Mar 14 2020
- Auto detect server host from client (gorarakelyan)
- Change ports from 8000,1,2 to 43800,1,2 (gorarakelyan)
- Add Profiler real time update (gorarakelyan)
- Add current run visualization (gorarakelyan)
- Add initial skeleton (gorarakelyan)