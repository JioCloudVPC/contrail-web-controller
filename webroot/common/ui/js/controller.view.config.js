/*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */

define([
    'underscore',
    'contrail-view-model'
], function (_, ContrailViewModel) {
    var CTViewConfig = function () {
        var self = this;

        self.getInstanceTabViewConfig = function (viewConfig) {
            var instanceUUID = viewConfig['instanceUUID'],
                instanceDetailsUrl = ctwc.get(ctwc.URL_INSTANCE_DETAIL, instanceUUID),
                networkFQN = viewConfig['networkFQN'],
                tabsToDisplay = viewConfig['tabsToDisplay'],
                tabObjs = [];
            var allTabs = [
                {
                    elementId: ctwl.INSTANCE_DETAILS_ID,
                    title: ctwl.TITLE_DETAILS,
                    view: "DetailsView",
                    viewConfig: {
                        ajaxConfig: {
                            url: instanceDetailsUrl,
                            type: 'GET'
                        },
                        modelKey: ctwc.get(ctwc.UMID_INSTANCE_UVE, instanceUUID),
                        templateConfig: ctwu.getInstanceDetailsTemplateConfig(),
                        app: cowc.APP_CONTRAIL_CONTROLLER,
                        dataParser: function (response) {
                            return {
                                name: instanceUUID,
                                value: response
                            };
                        }
                    }
                },
                {
                    elementId: ctwl.INSTANCE_INTERFACE_ID,
                    title: ctwl.TITLE_INTERFACES,
                    view: "InterfaceGridView",
                    app: cowc.APP_CONTRAIL_CONTROLLER,
                    viewConfig: {
                        modelKey: ctwc.get(ctwc.UMID_INSTANCE_UVE, instanceUUID),
                        instanceUUID: instanceUUID,
                        networkFQN: networkFQN
                    }
                },
                {
                    elementId: ctwl.INSTANCE_TRAFFIC_STATS_ID,
                    title: ctwl.TITLE_TRAFFIC_STATISTICS,
                    app: cowc.APP_CONTRAIL_CONTROLLER,
                    view: "InstanceTrafficStatsView",
                    viewConfig: {
                        modelKey: ctwc.get(ctwc.UMID_INSTANCE_UVE, instanceUUID),
                        instanceUUID: instanceUUID,
                        parseFn: ctwp.parseTrafficLineChartData
                    }
                },
                {
                    elementId: ctwl.INSTANCE_PORT_DIST_ID,
                    title: ctwl.TITLE_PORT_DISTRIBUTION,
                    app: cowc.APP_CONTRAIL_CONTROLLER,
                    view: "InstancePortDistributionView",
                    viewConfig: {
                        modelKey: ctwc.get(ctwc.UMID_INSTANCE_UVE, instanceUUID),
                        instanceUUID: instanceUUID
                    }
                },
                {
                    elementId: ctwl.INSTANCE_PORT_HEAT_CHART_ID,
                    title: ctwl.TITLE_PORT_MAP,
                    view: "HeatChartView",
                    viewConfig: {
                        ajaxConfig: {
                            url: ctwc.get(ctwc.URL_INSTANCE_DETAIL, instanceUUID),
                            type: 'GET'
                        },
                        chartOptions: {getClickFn: function(){}}
                    }
                },
                {
                    elementId: ctwl.INSTANCE_CPU_MEM_STATS_ID,
                    title: ctwl.TITLE_CPU_MEMORY,
                    view: "LineBarWithFocusChartView",
                    viewConfig: {
                        modelConfig: getInstanceCPUMemModelConfig(networkFQN, instanceUUID),
                        parseFn: ctwp.parseCPUMemLineChartData
                    }
                }
            ];
            if (tabsToDisplay == null) {
                tabObjs = allTabs;
            } else if (typeof tabsToDisplay =='string' || $.isArray(tabsToDisplay)) {
                if(typeof tabsToDisplay == 'string') {
                    tabsToDisplay = [tabsToDisplay];
                }
                for(var i = 0; i < tabsToDisplay.length; i++ ) {
                    $.each(allTabs,function(idx,obj) {
                        if(obj['view'] == tabsToDisplay[i])
                            tabObjs.push(obj);
                    });
                }
            }
            return {
                elementId: cowu.formatElementId([ctwl.MONITOR_INSTANCE_VIEW_ID, '-section']),
                view: "SectionView",
                viewConfig: {
                    rows: [
                        {
                            columns: [
                                {
                                    elementId: ctwl.INSTANCE_TABS_ID,
                                    view: "TabsView",
                                    viewConfig: {
                                        theme: 'classic',
                                        active: 1,
                                        activate: function (e, ui) {
                                            var selTab = $(ui.newTab.context).text();
                                            if (selTab == ctwl.TITLE_TRAFFIC_STATISTICS) {
                                                $('#' + ctwl.INSTANCE_TRAFFIC_STATS_ID).find('svg').trigger('refresh');
                                            } else if (selTab == ctwl.TITLE_INTERFACES) {
                                                $('#' + ctwl.INSTANCE_INTERFACE_GRID_ID).data('contrailGrid').refreshView();
                                            } else if (selTab == ctwl.TITLE_CPU_MEMORY) {
                                                $('#' + ctwl.INSTANCE_CPU_MEM_STATS_ID).find('svg').trigger('refresh');
                                            } else if (selTab == ctwl.TITLE_PORT_DISTRIBUTION) {
                                                $('#' + ctwl.INSTANCE_PORT_DIST_CHART_ID).trigger('refresh');
                                            }
                                        },
                                        tabs: tabObjs
                                    }
                                }
                            ]
                        }
                    ]
                }
            }

        };

        self.getInstanceTabViewModelConfig = function (instanceUUID) {
            var modelKey = ctwc.get(ctwc.UMID_INSTANCE_UVE, instanceUUID);
            var viewModelConfig = {
                modelKey: modelKey,
                remote: {
                    ajaxConfig: {
                        url: ctwc.get(ctwc.URL_INSTANCE_DETAIL, instanceUUID),
                        type: 'GET'
                    },
                    dataParser: function(response) {
                        return {name: instanceUUID, value: response};
                    }
                },
                cacheConfig: {
                    ucid: ctwc.UCID_PREFIX_MN_UVES + instanceUUID
                },
                vlRemoteConfig: {
                    vlRemoteList: ctwgc.getVMInterfacesLazyRemoteConfig()
                }
            };

            return new ContrailViewModel(viewModelConfig);
        };

        self.getHeatChartClickFn = function(selector, response) {
            return function(clickData) {
                var currHashObj = layoutHandler.getURLHashObj(),
                    startRange = ((64 * clickData.y) + clickData.x) * 256,
                    endRange = startRange + 255,
                    hashParams = {}, protocolMap = {'icmp': 1, 'tcp': 6, 'udp': 17};

                hashParams['fqName'] = currHashObj['q']['fqName'];
                hashParams['port'] = startRange + "-" + endRange;
                hashParams['startTime'] = new XDate().addMinutes(-10).getTime();
                hashParams['endTime'] = new XDate().getTime();
                hashParams['portType'] = response['type'];
                hashParams['protocol'] = protocolMap[response['pType']];
                hashParams['type'] = "flow";
                hashParams['view'] = "list";

                layoutHandler.setURLHashParams(hashParams, {p: 'mon_networking_networks'});
            }
        };
    };

    function getInstanceCPUMemModelConfig(networkFQN, instanceUUID) {
        var postData = {
            async: false,
            fromTimeUTC: "now-120m",
            toTimeUTC: "now",
            select: "Source, T, cpu_stats.cpu_one_min_avg, cpu_stats.rss, name",
            table: "StatTable.VirtualMachineStats.cpu_stats",
            where: "(name = " + instanceUUID + ")"
        };

        var modelConfig = {
            remote: {
                ajaxConfig: {
                    url: ctwc.URL_QUERY,
                    type: 'POST',
                    data: JSON.stringify(postData)
                },
                dataParser: function (response) {
                    return response['data']
                }
            },
            cacheConfig: {
                ucid: ctwc.get(ctwc.UCID_INSTANCE_CPU_MEMORY_LIST, networkFQN, instanceUUID)
            }
        };

        return modelConfig;
    };

    return CTViewConfig;
});