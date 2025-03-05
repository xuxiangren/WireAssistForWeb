document.addEventListener('DOMContentLoaded', function() {
    // 初始化历史记录
    let history = JSON.parse(localStorage.getItem('wireCalculatorHistory')) || [];
    
    // 检测当前页面
    const isCalculatorPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
    const isHistoryPage = window.location.pathname.endsWith('history.html');
    
    // 获取DOM元素 - 仅在计算器页面执行
    if (isCalculatorPage) {
        const deviceNameInput = document.getElementById('deviceNameInput');
        const drumDiameterInput = document.getElementById('drumDiameterInput');
        const wireDiameterInput = document.querySelector('.input-group:nth-child(3) input');
        const axialLengthInput = document.querySelector('.input-group:nth-child(4) input');
        const totalLengthInput = document.querySelector('.input-group:nth-child(5) input');
        const calculateBtn = document.querySelector('.calculate-btn');
        const copyBtns = document.querySelectorAll('.copy-btn');
        const deviceDropdown = document.getElementById('deviceDropdown');
        const wireDropdown = document.getElementById('wireDropdown');
        
        // 初始化设备名称和钼丝直径下拉菜单
        initDropdowns();
    
        // 计算按钮点击事件
        calculateBtn.addEventListener('click', function() {
            // 获取输入值
            const deviceName = deviceNameInput.value.trim();
            const drumDiameter = parseFloat(drumDiameterInput.value);
            const wireDiameter = parseFloat(wireDiameterInput.value);
            const axialLength = parseFloat(axialLengthInput.value);
            
            // 验证输入
            if (!deviceName) {
                alert('请输入设备名称');
                return;
            }
            
            if (isNaN(drumDiameter) || isNaN(wireDiameter) || isNaN(axialLength)) {
                alert('请输入有效的数值');
                return;
            }
            
            // 计算公式：钼丝缠绕总长度 = 轴向缠绕长度 / 钼丝直径 * π * (运丝筒直径 + 钼丝直径)
            const totalLength = (axialLength / wireDiameter) * Math.PI * (drumDiameter + wireDiameter) / 1000; // 转换为米
            
            // 显示结果（保留2位小数）
            totalLengthInput.value = totalLength.toFixed(2);
            
            // 保存到历史记录
            saveToHistory(deviceName, drumDiameter, wireDiameter, axialLength, totalLength);
        });
        
        // 复制按钮点击事件
        copyBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                const input = this.parentElement.querySelector('input');
                copyToClipboard(input.value);
                showCopyTooltip(this);
            });
        });
    }

    // 仅在历史记录页面执行
    if (isHistoryPage) {
        // 显示历史记录
        displayHistory();
        
        // 初始化筛选功能
        initFilters();

        // 导出相关变量
        let currentExportMode = 'all'; // 默认导出全部
        const exportBtn = document.getElementById('exportHistory');
        const exportBtnText = document.getElementById('exportBtnText');
        const exportDropdown = document.getElementById('exportDropdown');
        
        // 初始化导出下拉菜单
        updateExportUI();
        
        // 导出按钮点击事件
        exportBtn.addEventListener('click', function() {
            exportData(currentExportMode);
        });
        
        // 导出下拉菜单点击事件
        exportDropdown.addEventListener('click', function(e) {
            if (e.target.classList.contains('dropdown-item')) {
                e.preventDefault();
                const exportType = e.target.getAttribute('data-export-type');
                if (exportType) {
                    currentExportMode = exportType === 'filtered' ? 'filtered' : 'all';
                    updateExportUI();
                    exportData(currentExportMode);
                }
            }
        });
        
        // 更新导出UI
        function updateExportUI() {
            // 更新主按钮文本
            exportBtnText.textContent = currentExportMode === 'all' ? '导出全部' : '导出显示';
            
            // 更新下拉菜单选项
            exportDropdown.innerHTML = '';
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.classList.add('dropdown-item');
            a.href = '#';
            a.setAttribute('data-export-type', currentExportMode === 'all' ? 'filtered' : 'all');
            a.textContent = currentExportMode === 'all' ? '导出显示' : '导出全部';
            li.appendChild(a);
            exportDropdown.appendChild(li);
        }
        
        // 导出数据函数
        function exportData(mode) {
            // 确定要导出的数据
            let dataToExport;
            if (mode === 'filtered') {
                // 获取当前筛选条件
                const deviceValue = document.getElementById('deviceFilter').value;
                const minLifespan = document.getElementById('lifespanMin').value ? parseFloat(document.getElementById('lifespanMin').value) : null;
                const maxLifespan = document.getElementById('lifespanMax').value ? parseFloat(document.getElementById('lifespanMax').value) : null;
                const startDate = document.getElementById('dateStart').value ? new Date(document.getElementById('dateStart').value) : null;
                const endDate = document.getElementById('dateEnd').value ? new Date(document.getElementById('dateEnd').value + 'T23:59:59') : null;
                
                // 应用筛选
                dataToExport = history.filter(record => {
                    // 设备名称筛选
                    if (deviceValue && record.deviceName !== deviceValue) {
                        return false;
                    }
                    
                    // 钼丝寿命筛选
                    if (record.scrapDate) {
                        const scrapTime = new Date(record.scrapDate);
                        const createTime = new Date(record.id);
                        const lifespan = (scrapTime - createTime) / (1000 * 60 * 60);
                        
                        if (minLifespan !== null && lifespan < minLifespan) {
                            return false;
                        }
                        
                        if (maxLifespan !== null && lifespan > maxLifespan) {
                            return false;
                        }
                    } else if (minLifespan !== null) {
                        // 如果设置了最小寿命但记录没有报废时间，则排除
                        return false;
                    }
                    
                    // 日期范围筛选
                    const recordDate = new Date(record.id);
                    if (startDate && recordDate < startDate) {
                        return false;
                    }
                    
                    if (endDate && recordDate > endDate) {
                        return false;
                    }
                    
                    return true;
                });
            } else {
                dataToExport = history;
            }
            
            // 生成CSV内容
            const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' +
                '时间,设备名称,运丝筒直径(mm),钼丝直径(mm),轴向长度(mm),总长度(m),钼丝报废时间,钼丝寿命(小时)\n' +
                dataToExport.map(record => {
                    let lifespan = '';
                    if (record.scrapDate) {
                        const scrapTime = new Date(record.scrapDate);
                        const createTime = new Date(record.id);
                        lifespan = ((scrapTime - createTime) / (1000 * 60 * 60)).toFixed(2);
                    }
                    return `${formatDateTime(new Date(record.id))},${record.deviceName},${record.drumDiameter},${record.wireDiameter},${record.axialLength},${record.totalLength},${record.scrapDate ? formatDateTime(new Date(record.scrapDate)) : ''},${lifespan}`;
                }).join('\n');
            
            // 下载CSV文件
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `钼丝计算历史记录_${new Date().toLocaleDateString()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        // 清空历史记录
        document.getElementById('clearHistory').addEventListener('click', function() {
            if (confirm('确定要清空所有历史记录吗？此操作不可恢复！')) {
                history = [];
                localStorage.setItem('wireCalculatorHistory', JSON.stringify(history));
                displayHistory();
            }
        });
    }
    
    // 通用函数
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('无法复制文本: ', err);
        });
    }
    
    function showCopyTooltip(button) {
        const originalTitle = button.getAttribute('title');
        button.setAttribute('title', '已复制!');
        button.classList.add('btn-success');
        button.classList.remove('copy-btn');
        
        setTimeout(function() {
            button.setAttribute('title', originalTitle);
            button.classList.remove('btn-success');
            button.classList.add('copy-btn');
        }, 1500);
    }
    
    function displayHistory(filteredRecords) {
        const historyTableBody = document.getElementById('historyTableBody');
        const historyCardsContainer = document.getElementById('historyCardsContainer');
        
        // 使用筛选后的记录或全部记录
        const recordsToDisplay = filteredRecords || history;
        
        // 如果是表格视图
        if (historyTableBody) {
            historyTableBody.innerHTML = '';
            
            recordsToDisplay.forEach(record => {
                // 计算钼丝寿命
                let lifespan = '';
                if (record.scrapDate) {
                    const scrapTime = new Date(record.scrapDate);
                    const createTime = new Date(record.id); // 使用记录ID作为创建时间
                    const diffHours = ((scrapTime - createTime) / (1000 * 60 * 60)).toFixed(2);
                    lifespan = diffHours >= 0 ? diffHours.toString() : '-';
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDateTime(new Date(record.id))}</td>
                    <td>${record.deviceName}</td>
                    <td>${record.drumDiameter}</td>
                    <td>${record.wireDiameter}</td>
                    <td>${record.axialLength}</td>
                    <td>${record.totalLength}</td>
                    <td>${record.scrapDate ? formatDateTime(new Date(record.scrapDate)) : '-'}</td>
                    <td>${lifespan}</td>
                    <td>
                        <button class="btn btn-outline-primary btn-sm action-btn" onclick="loadRecord(${record.id})">
                            <i class="fas fa-redo me-1"></i>重新计算
                        </button>
                        <button class="btn btn-outline-secondary btn-sm action-btn" onclick="editRecord(${record.id})">
                            <i class="fas fa-edit me-1"></i>编辑
                        </button>
                        <button class="btn btn-outline-danger btn-sm action-btn" onclick="deleteRecord(${record.id})">
                            <i class="fas fa-trash me-1"></i>删除
                        </button>
                    </td>
                `;
                historyTableBody.appendChild(tr);
            });
        }
        
        // 如果是卡片视图
        if (historyCardsContainer) {
            historyCardsContainer.innerHTML = '';
            
            recordsToDisplay.forEach(record => {
                // 计算钼丝寿命
                let lifespan = '';
                if (record.scrapDate) {
                    const scrapTime = new Date(record.scrapDate);
                    const createTime = new Date(record.id); // 使用记录ID作为创建时间
                    const diffHours = ((scrapTime - createTime) / (1000 * 60 * 60)).toFixed(2);
                    lifespan = diffHours >= 0 ? diffHours.toString() : '-';
                }
                
                const card = document.createElement('div');
                card.className = 'history-card';
                card.innerHTML = `
                    <div class="card-header">
                        <strong>${record.deviceName}</strong>
                        <div class="text-muted small">${formatDateTime(new Date(record.id))}</div>
                    </div>
                    <div class="card-content">
                        <div class="data-item">
                            <span class="label">运丝筒直径:</span>
                            <span>${record.drumDiameter} mm</span>
                        </div>
                        <div class="data-item">
                            <span class="label">钼丝直径:</span>
                            <span>${record.wireDiameter} mm</span>
                        </div>
                        <div class="data-item">
                            <span class="label">轴向长度:</span>
                            <span>${record.axialLength} mm</span>
                        </div>
                        <div class="data-item">
                            <span class="label">总长度:</span>
                            <span>${record.totalLength} m</span>
                        </div>
                        <div class="data-item">
                            <span class="label">报废时间:</span>
                            <span>${record.scrapDate ? formatDateTime(new Date(record.scrapDate)) : '-'}</span>
                        </div>
                        <div class="data-item">
                            <span class="label">钼丝寿命:</span>
                            <span>${lifespan} 小时</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-outline-primary btn-sm action-btn" onclick="loadRecord(${record.id})">
                            <i class="fas fa-redo me-1"></i>重新计算
                        </button>
                        <button class="btn btn-outline-secondary btn-sm action-btn" onclick="editRecord(${record.id})">
                            <i class="fas fa-edit me-1"></i>编辑
                        </button>
                        <button class="btn btn-outline-danger btn-sm action-btn" onclick="deleteRecord(${record.id})">
                            <i class="fas fa-trash me-1"></i>删除
                        </button>
                    </div>
                `;
                historyCardsContainer.appendChild(card);
            });
        }
    }
    
    function formatDateTime(date) {
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function saveToHistory(deviceName, drumDiameter, wireDiameter, axialLength, totalLength) {
        const record = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            deviceName: deviceName,
            drumDiameter: drumDiameter,
            wireDiameter: wireDiameter,
            axialLength: axialLength,
            totalLength: totalLength.toFixed(2),
            scrapDate: null
        };
        
        history.unshift(record);
        
        if (history.length > 50) {
            history = history.slice(0, 50);
        }
        
        localStorage.setItem('wireCalculatorHistory', JSON.stringify(history));
        updateHistoryAndApplyFilters();
        
        if (isCalculatorPage) {
            initDropdowns();
        }
    }

    // 初始化筛选功能
    function initFilters() {
        const deviceFilter = document.getElementById('deviceFilter');
        const lifespanMin = document.getElementById('lifespanMin');
        const lifespanMax = document.getElementById('lifespanMax');
        const dateStart = document.getElementById('dateStart');
        const dateEnd = document.getElementById('dateEnd');
        
        // 填充设备名称筛选下拉菜单
        const uniqueDevices = new Set();
        history.forEach(record => {
            if (record.deviceName) uniqueDevices.add(record.deviceName);
        });
        
        deviceFilter.innerHTML = '<option value="">全部设备</option>';
        uniqueDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device;
            option.textContent = device;
            deviceFilter.appendChild(option);
        });
        
        // 添加筛选事件监听
        const filterElements = [deviceFilter, lifespanMin, lifespanMax, dateStart, dateEnd];
        filterElements.forEach(element => {
            element.addEventListener('change', applyFilters);
        });
        
        // 应用筛选条件
        function applyFilters() {
            const deviceValue = deviceFilter.value;
            const minLifespan = lifespanMin.value ? parseFloat(lifespanMin.value) : null;
            const maxLifespan = lifespanMax.value ? parseFloat(lifespanMax.value) : null;
            const startDate = dateStart.value ? new Date(dateStart.value) : null;
            const endDate = dateEnd.value ? new Date(dateEnd.value + 'T23:59:59') : null;
            
            // 保存筛选条件到localStorage
            localStorage.setItem('filterConditions', JSON.stringify({
                deviceValue,
                minLifespan,
                maxLifespan,
                startDate: startDate ? startDate.toISOString() : null,
                endDate: endDate ? endDate.toISOString() : null
            }));

            const filteredRecords = history.filter(record => {
                // 设备名称筛选
                if (deviceValue && record.deviceName !== deviceValue) {
                    return false;
                }
                
                // 钼丝寿命筛选
                if (record.scrapDate) {
                    const scrapTime = new Date(record.scrapDate);
                    const createTime = new Date(record.id);
                    const lifespan = (scrapTime - createTime) / (1000 * 60 * 60);
                    
                    if (minLifespan !== null && lifespan < minLifespan) {
                        return false;
                    }
                    
                    if (maxLifespan !== null && lifespan > maxLifespan) {
                        return false;
                    }
                } else if (minLifespan !== null) {
                    // 如果设置了最小寿命但记录没有报废时间，则排除
                    return false;
                }
                
                // 日期范围筛选
                const recordDate = new Date(record.id);
                if (startDate && recordDate < startDate) {
                    return false;
                }
                
                if (endDate && recordDate > endDate) {
                    return false;
                }
                
                return true;
            });
            
            // 保存筛选结果到localStorage
            localStorage.setItem('filteredRecords', JSON.stringify(filteredRecords));
            
            // 显示筛选后的记录
            displayHistory(filteredRecords);
        }
    }
    
    // 编辑记录相关功能
    if (isHistoryPage) {
        const editModal = new bootstrap.Modal(document.getElementById('editRecordModal'));
        const editForm = document.getElementById('editRecordForm');
        const saveEditBtn = document.getElementById('saveEditBtn');

        window.editRecord = function(id) {
            const record = history.find(r => r.id === id);
            if (record) {
                document.getElementById('editRecordId').value = record.id;
                document.getElementById('editDeviceName').value = record.deviceName;
                document.getElementById('editDrumDiameter').value = record.drumDiameter;
                document.getElementById('editWireDiameter').value = record.wireDiameter;
                document.getElementById('editAxialLength').value = record.axialLength;
                document.getElementById('editScrapDate').value = record.scrapDate ? new Date(record.scrapDate).toISOString().slice(0, 16) : '';
                editModal.show();
            }
        };

        saveEditBtn.addEventListener('click', function() {
            const id = parseInt(document.getElementById('editRecordId').value);
            const record = history.find(r => r.id === id);
            if (record) {
                record.deviceName = document.getElementById('editDeviceName').value;
                record.drumDiameter = parseFloat(document.getElementById('editDrumDiameter').value);
                record.wireDiameter = parseFloat(document.getElementById('editWireDiameter').value);
                record.axialLength = parseFloat(document.getElementById('editAxialLength').value);
                record.scrapDate = document.getElementById('editScrapDate').value || null;
                
                // 重新计算总长度
                const drumDiameter = record.drumDiameter;
                const wireDiameter = record.wireDiameter;
                const axialLength = record.axialLength;
                const totalLength = (axialLength / wireDiameter) * Math.PI * (drumDiameter + wireDiameter) / 1000; // 转换为米
                record.totalLength = totalLength.toFixed(2);

                localStorage.setItem('wireCalculatorHistory', JSON.stringify(history));
                displayHistory();
                editModal.hide();
            }
        });

        // 导出历史记录时包含新增字段
        document.getElementById('exportHistory').addEventListener('click', function() {
            const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' +
                '时间,设备名称,运丝筒直径(mm),钼丝直径(mm),轴向长度(mm),总长度(m),钼丝报废时间,钼丝寿命(小时)\n' +
                history.map(record => {
                    let lifespan = '';
                    if (record.scrapDate) {
                        const scrapTime = new Date(record.scrapDate);
                        const createTime = new Date(record.id);
                        lifespan = Math.round((scrapTime - createTime) / (1000 * 60 * 60));
                    }
                    return `${formatDateTime(new Date(record.id))},${record.deviceName},${record.drumDiameter},${record.wireDiameter},${record.axialLength},${record.totalLength},${record.scrapDate ? formatDateTime(new Date(record.scrapDate)) : ''},${lifespan}`;
                }).join('\n');
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `钼丝计算历史记录_${new Date().toLocaleDateString()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // 初始化下拉菜单
    function initDropdowns() {
        if (!deviceDropdown || !wireDropdown) return;
        
        // 清空下拉菜单
        deviceDropdown.innerHTML = '';
        wireDropdown.innerHTML = '';
        const drumDropdown = document.getElementById('drumDropdown');
        if (drumDropdown) drumDropdown.innerHTML = '';
        
        // 用于存储唯一的设备名称、运丝筒直径和钼丝直径
        const uniqueDevices = new Set();
        const uniqueWireDiameters = new Set();
        const uniqueDrumDiameters = new Set();
        
        // 从历史记录中提取唯一的设备名称、运丝筒直径和钼丝直径
        history.forEach(record => {
            if (record.deviceName) uniqueDevices.add(record.deviceName);
            if (record.wireDiameter) uniqueWireDiameters.add(record.wireDiameter);
            if (record.drumDiameter) uniqueDrumDiameters.add(record.drumDiameter);
        });
        
        // 添加设备名称到下拉菜单
        uniqueDevices.forEach(device => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.classList.add('dropdown-item');
            a.href = '#';
            a.textContent = device;
            a.addEventListener('click', function(e) {
                e.preventDefault();
                deviceNameInput.value = device;
                
                // 自动填充与设备关联的运丝筒直径
                const deviceRecords = history.filter(record => record.deviceName === device);
                if (deviceRecords.length > 0) {
                    // 使用最近一次该设备的运丝筒直径
                    drumDiameterInput.value = deviceRecords[0].drumDiameter;
                }
            });
            li.appendChild(a);
            deviceDropdown.appendChild(li);
        });
        
        // 添加运丝筒直径到下拉菜单
        if (drumDropdown) {
            uniqueDrumDiameters.forEach(diameter => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.classList.add('dropdown-item');
                a.href = '#';
                a.textContent = diameter;
                a.addEventListener('click', function(e) {
                    e.preventDefault();
                    drumDiameterInput.value = diameter;
                });
                li.appendChild(a);
                drumDropdown.appendChild(li);
            });
        }
        
        // 添加钼丝直径到下拉菜单
        uniqueWireDiameters.forEach(diameter => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.classList.add('dropdown-item');
            a.href = '#';
            a.textContent = diameter;
            a.addEventListener('click', function(e) {
                e.preventDefault();
                wireDiameterInput.value = diameter;
            });
            li.appendChild(a);
            wireDropdown.appendChild(li);
        });
    }

    // 全局函数
    window.loadRecord = function(id) {
        if (!isCalculatorPage) {
            window.location.href = 'index.html?load=' + id;
            return;
        }

        const record = history.find(r => r.id === id);
        if (record) {
            deviceNameInput.value = record.deviceName;
            drumDiameterInput.value = record.drumDiameter;
            wireDiameterInput.value = record.wireDiameter;
            axialLengthInput.value = record.axialLength;
            totalLengthInput.value = record.totalLength;
        }
    };
    
    window.deleteRecord = function(id) {
        if (confirm('确定要删除这条记录吗？')) {
            history = history.filter(r => r.id !== id);
            localStorage.setItem('wireCalculatorHistory', JSON.stringify(history));
            updateHistoryAndApplyFilters();
        }
    };

    // 检查URL参数是否需要加载记录
    if (isCalculatorPage) {
        const urlParams = new URLSearchParams(window.location.search);
        const loadId = urlParams.get('load');
        if (loadId) {
            window.loadRecord(parseInt(loadId));
        }
    }

    // 在页面加载时应用保存的筛选条件和结果
    window.addEventListener('DOMContentLoaded', function() {
        const savedConditions = JSON.parse(localStorage.getItem('filterConditions'));
        if (savedConditions) {
            const deviceFilter = document.getElementById('deviceFilter');
            const lifespanMin = document.getElementById('lifespanMin');
            const lifespanMax = document.getElementById('lifespanMax');
            const dateStart = document.getElementById('dateStart');
            const dateEnd = document.getElementById('dateEnd');

            deviceFilter.value = savedConditions.deviceValue || '';
            lifespanMin.value = savedConditions.minLifespan || '';
            lifespanMax.value = savedConditions.maxLifespan || '';
            dateStart.value = savedConditions.startDate ? new Date(savedConditions.startDate).toISOString().slice(0, 10) : '';
            dateEnd.value = savedConditions.endDate ? new Date(savedConditions.endDate).toISOString().slice(0, 10) : '';
        }
        updateHistoryAndApplyFilters();
    });

    // 在历史记录变动后重新应用筛选条件
    function updateHistoryAndApplyFilters() {
        const savedConditions = JSON.parse(localStorage.getItem('filterConditions'));
        if (savedConditions) {
            const deviceValue = savedConditions.deviceValue || '';
            const minLifespan = savedConditions.minLifespan || null;
            const maxLifespan = savedConditions.maxLifespan || null;
            const startDate = savedConditions.startDate ? new Date(savedConditions.startDate) : null;
            const endDate = savedConditions.endDate ? new Date(savedConditions.endDate) : null;

            const filteredRecords = history.filter(record => {
                // 设备名称筛选
                if (deviceValue && record.deviceName !== deviceValue) {
                    return false;
                }
                
                // 钼丝寿命筛选
                if (record.scrapDate) {
                    const scrapTime = new Date(record.scrapDate);
                    const createTime = new Date(record.id);
                    const lifespan = (scrapTime - createTime) / (1000 * 60 * 60);
                    
                    if (minLifespan !== null && lifespan < minLifespan) {
                        return false;
                    }
                    
                    if (maxLifespan !== null && lifespan > maxLifespan) {
                        return false;
                    }
                } else if (minLifespan !== null) {
                    // 如果设置了最小寿命但记录没有报废时间，则排除
                    return false;
                }
                
                // 日期范围筛选
                const recordDate = new Date(record.id);
                if (startDate && recordDate < startDate) {
                    return false;
                }
                
                if (endDate && recordDate > endDate) {
                    return false;
                }
                
                return true;
            });

            // 保存筛选结果到localStorage
            localStorage.setItem('filteredRecords', JSON.stringify(filteredRecords));
            
            // 显示筛选后的记录
            displayHistory(filteredRecords);
        } else {
            displayHistory();
        }
    }
});