/* Customer setup only: same validated ERS/GATT installer, bundled web data.
 * No device writes occur on page load or when the font selector changes. */
(function (root) {
  'use strict';
  const $ = id => document.getElementById(id);
  let preparing = false;
  const family = () => $('resourceVietnameseFamily');
  const installer = () => root.ExternalResourceInstaller;
  function message(text) {
    $('externalResourceStatus').textContent = text;
    if (typeof root.addLog === 'function') root.addLog(text);
  }
  async function load() {
    if (preparing || installer().busy() || root.DeviceOperations?.current) return false;
    preparing = true; family().disabled = true; installer().controls();
    try { return await root.ExternalResourceEditor.loadDefault(); }
    finally { preparing = false; family().disabled = false; installer().controls(); }
  }
  async function install() {
    if (preparing || installer().busy() || root.DeviceOperations?.current) return;
    preparing = true; family().disabled = true; installer().controls();
    try {
      message('Đang chuẩn bị bộ cài đồng hồ. Giữ kết nối Bluetooth và không đóng trang.');
      if (!await root.ExternalResourceEditor.loadDefault()) {
        message('Không chuẩn bị được bộ cài. Chưa ghi dữ liệu vào đồng hồ.');
        return;
      }
      await installer().install();
    } catch (error) { message(`Cài đặt chưa hoàn tất: ${error.message}`); }
    finally { preparing = false; family().disabled = false; installer().controls(); }
  }
  root.ClockSetup = { install, load, busy: () => preparing };
  family().addEventListener('change', load);
  load();
})(globalThis);
