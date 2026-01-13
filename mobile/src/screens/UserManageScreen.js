import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { colors, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const UserManageScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // 새 사용자 폼 데이터
  const [newUserName, setNewUserName] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserGroup, setNewUserGroup] = useState('A동');
  const [newUserBand, setNewUserBand] = useState('');

  // 그룹 관리
  const [newGroupName, setNewGroupName] = useState('');

  // 모의 사용자 데이터
  const users = [
    {
      id: 1,
      name: '김태현',
      oderId: 'kimth_82',
      phone: '010-2345-6789',
      group: 'A동',
      bandId: '467191213660619',
      status: '활성',
    },
    {
      id: 2,
      name: '강민준',
      oderId: 'kangmj_45',
      phone: '010-3456-7890',
      group: 'B동',
      bandId: '467191213660620',
      status: '활성',
    },
    {
      id: 3,
      name: '윤서연',
      oderId: 'yoonsy_67',
      phone: '010-4567-8901',
      group: 'C동',
      bandId: '467191213660614',
      status: '활성',
    },
    {
      id: 4,
      name: '이수빈',
      oderId: 'leesb_23',
      phone: '010-5678-9012',
      group: 'A동',
      bandId: '467191213660616',
      status: '활성',
    },
    {
      id: 5,
      name: '박도현',
      oderId: 'parkdh_91',
      phone: '010-6789-0123',
      group: 'B동',
      bandId: '467191213660623',
      status: '활성',
    },
  ];

  const groups = ['A동', 'B동', 'C동'];

  const filteredUsers = users.filter(user => {
    const matchSearch = searchText === '' ||
      user.name.toLowerCase().includes(searchText.toLowerCase());
    const matchGroup = groupFilter === '' || user.group === groupFilter;
    return matchSearch && matchGroup;
  });

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>사용자</Text>

        {/* 검색 및 필터 */}
        <View style={[styles.card, shadow.small]}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="사용자 검색..."
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor={colors.textLight}
              />
            </View>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={groupFilter}
                onValueChange={setGroupFilter}
                style={styles.picker}
              >
                <Picker.Item label="그룹 전체" value="" />
                {groups.map(group => (
                  <Picker.Item key={group} label={group} value={group} />
                ))}
              </Picker>
            </View>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => setGroupModalVisible(true)}
            >
              <Text style={styles.buttonSecondaryText}>그룹 관리</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => setAddModalVisible(true)}
            >
              <Text style={styles.buttonPrimaryText}>+ 사용자 추가</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 사용자 테이블 */}
        <View style={[styles.card, shadow.small]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* 테이블 헤더 */}
              <View style={styles.tableHeader}>
                <Text style={[styles.headerText, styles.colName]}>이름</Text>
                <Text style={[styles.headerText, styles.colId]}>아이디</Text>
                <Text style={[styles.headerText, styles.colPhone]}>연락처</Text>
                <Text style={[styles.headerText, styles.colGroup]}>그룹</Text>
                <Text style={[styles.headerText, styles.colBand]}>연결 밴드</Text>
                <Text style={[styles.headerText, styles.colStatus]}>상태</Text>
                <Text style={[styles.headerText, styles.colAction]}>관리</Text>
              </View>

              {/* 테이블 데이터 */}
              {filteredUsers.map((user, index) => (
                <View
                  key={user.id}
                  style={[styles.tableRow, index < filteredUsers.length - 1 && styles.tableBorder]}
                >
                  <Text style={[styles.cellText, styles.cellTextBold, styles.colName]}>{user.name}</Text>
                  <Text style={[styles.cellText, styles.colId]}>{user.oderId}</Text>
                  <Text style={[styles.cellText, styles.colPhone]}>{user.phone}</Text>
                  <Text style={[styles.cellText, styles.colGroup]}>{user.group}</Text>
                  <Text style={[styles.cellText, styles.colBand]}>{user.bandId}</Text>
                  <View style={[styles.colStatus, { alignItems: 'center' }]}>
                    <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.statusText}>{user.status}</Text>
                    </View>
                  </View>
                  <View style={[styles.colAction, styles.actionButtons]}>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedUser(user);
                        setEditModalVisible(true);
                      }}
                    >
                      <Text style={styles.actionButtonText}>수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(
                          '사용자 삭제',
                          `${user.name}님을 삭제하시겠습니까?`,
                          [
                            { text: '취소', style: 'cancel' },
                            { text: '삭제', style: 'destructive', onPress: () => alert('삭제되었습니다') }
                          ]
                        );
                      }}
                    >
                      <Text style={[styles.actionButtonText, styles.deleteText]}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* 사용자 추가 모달 */}
      <Modal
        visible={addModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>사용자 추가</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>이름</Text>
                <TextInput
                  style={styles.formInput}
                  value={newUserName}
                  onChangeText={setNewUserName}
                  placeholder="이름 입력"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>아이디</Text>
                <TextInput
                  style={styles.formInput}
                  value={newUserId}
                  onChangeText={setNewUserId}
                  placeholder="아이디 입력"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>연락처</Text>
                <TextInput
                  style={styles.formInput}
                  value={newUserPhone}
                  onChangeText={setNewUserPhone}
                  placeholder="010-0000-0000"
                  placeholderTextColor={colors.textLight}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>그룹</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={newUserGroup}
                    onValueChange={setNewUserGroup}
                    style={styles.picker}
                  >
                    {groups.map(group => (
                      <Picker.Item key={group} label={group} value={group} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>연결 밴드</Text>
                <TextInput
                  style={styles.formInput}
                  value={newUserBand}
                  onChangeText={setNewUserBand}
                  placeholder="선택안함"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  alert('사용자가 추가되었습니다');
                  setAddModalVisible(false);
                  setNewUserName('');
                  setNewUserId('');
                  setNewUserPhone('');
                  setNewUserBand('');
                }}
              >
                <Text style={styles.modalButtonText}>추가</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 사용자 수정 모달 */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>사용자 수정 - {selectedUser?.name}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>이름</Text>
                <TextInput
                  style={styles.formInput}
                  defaultValue={selectedUser?.name}
                  placeholder="이름 입력"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>연락처</Text>
                <TextInput
                  style={styles.formInput}
                  defaultValue={selectedUser?.phone}
                  placeholder="010-0000-0000"
                  placeholderTextColor={colors.textLight}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>그룹</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedUser?.group}
                    style={styles.picker}
                  >
                    {groups.map(group => (
                      <Picker.Item key={group} label={group} value={group} />
                    ))}
                  </Picker>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  alert('사용자 정보가 수정되었습니다');
                  setEditModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>저장</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 그룹 관리 모달 */}
      <Modal
        visible={groupModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setGroupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>그룹 관리</Text>
              <TouchableOpacity onPress={() => setGroupModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {groups.map(group => (
                <View key={group} style={styles.groupItem}>
                  <Text style={styles.groupName}>{group}</Text>
                  <Text style={styles.groupCount}>
                    {users.filter(u => u.group === group).length}명
                  </Text>
                </View>
              ))}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>새 그룹명</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                    placeholder="그룹명 입력"
                    placeholderTextColor={colors.textLight}
                  />
                  <TouchableOpacity
                    style={[styles.button, styles.buttonPrimary]}
                    onPress={() => {
                      if (newGroupName) {
                        alert('그룹이 추가되었습니다');
                        setNewGroupName('');
                      }
                    }}
                  >
                    <Text style={styles.buttonPrimaryText}>추가</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  screenTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: scaleSize(14),
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scaleSize(8),
    paddingHorizontal: spacing.sm,
    backgroundColor: 'white',
  },
  searchInput: {
    flex: 1,
    height: scaleSize(44),
    fontSize: scaleFontSize(13),
    color: colors.text,
    marginLeft: spacing.xs,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scaleSize(8),
    overflow: 'hidden',
    backgroundColor: 'white',
    minWidth: scaleSize(100),
  },
  picker: {
    height: scaleSize(44),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: scaleSize(10),
    borderRadius: scaleSize(8),
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonPrimaryText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: 'white',
  },
  buttonSecondaryText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: colors.primary,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    paddingVertical: scaleSize(10),
    paddingHorizontal: scaleSize(8),
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: scaleSize(10),
    paddingHorizontal: scaleSize(8),
    alignItems: 'center',
  },
  tableBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  cellText: {
    fontSize: scaleFontSize(11),
    color: colors.text,
    textAlign: 'center',
  },
  cellTextBold: {
    fontWeight: '500',
  },
  colName: {
    width: scaleSize(60),
  },
  colId: {
    width: scaleSize(80),
  },
  colPhone: {
    width: scaleSize(100),
  },
  colGroup: {
    width: scaleSize(50),
  },
  colBand: {
    width: scaleSize(130),
  },
  colStatus: {
    width: scaleSize(60),
  },
  colAction: {
    width: scaleSize(80),
  },
  statusBadge: {
    paddingHorizontal: scaleSize(8),
    paddingVertical: scaleSize(4),
    borderRadius: scaleSize(6),
  },
  statusText: {
    fontSize: scaleFontSize(10),
    fontWeight: '600',
    color: 'white',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: scaleFontSize(11),
    fontWeight: '500',
    color: '#2196F3',
  },
  deleteText: {
    color: '#E53935',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: scaleSize(12),
    width: '100%',
    maxHeight: '80%',
    ...shadow.small,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: colors.text,
  },
  modalContent: {
    padding: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: scaleFontSize(13),
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scaleSize(8),
    padding: spacing.sm,
    fontSize: scaleFontSize(13),
    color: colors.text,
    backgroundColor: 'white',
  },
  modalButton: {
    width: '100%',
    paddingVertical: scaleSize(12),
    borderRadius: scaleSize(8),
    alignItems: 'center',
    marginTop: spacing.md,
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: 'white',
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  groupName: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
    color: colors.text,
  },
  groupCount: {
    fontSize: scaleFontSize(13),
    color: colors.textSecondary,
  },
});

export default UserManageScreen;
